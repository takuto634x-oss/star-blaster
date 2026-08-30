// ===== GAME LOOP (update) =====
function update(doUI=true) {
  frameCount++;

  if (comboTimer > 0) comboTimer--;
  else comboCount = 0;
  Achievements.tickRunCombo();
  if (permKillSpeedTimer > 0) permKillSpeedTimer--;

  // --- gauge & shield regen ---
  addGauge(getGaugeFillRate());
  const shieldRegenIv = getEffectiveShieldRechargeInterval();
  if (shieldRegenIv > 0 && player.powerups.shield === 0) {
    shieldRechargeTimer--;
    if (shieldRechargeTimer <= 0) {
      player.powerups.shield = 1;
      shieldRechargeTimer = shieldRegenIv;
      spawnParticles(player.x, player.y, 8, '#00ccff', 3, 25);
    }
  }

  // --- player input & shooting ---
  const baseSpd = player.speed * getMoveSpeedMult();
  const spd = baseSpd + (player.powerups.rapid>0?1:0);
  if (keys['ArrowLeft'] ||keys['KeyA']) player.x -= spd;
  if (keys['ArrowRight']||keys['KeyD']) player.x += spd;
  if (keys['ArrowUp']   ||keys['KeyW']) player.y -= spd;
  if (keys['ArrowDown'] ||keys['KeyS']) player.y += spd;
  if (touchInput.dx !== 0 || touchInput.dy !== 0) {
    player.x += touchInput.dx * spd;
    player.y += touchInput.dy * spd;
  }
  player.x = Math.max(player.w/2, Math.min(W-player.w/2, player.x));
  player.y = Math.max(player.h/2, Math.min(H-player.h/2+20, player.y));

  updateOrbitGuard();

  if (keys['Space'] || touchInput.fire) shootBullet();
  if (player.shootCooldown>0) player.shootCooldown--;
  Object.keys(player.powerups).forEach(k => { if (player.powerups[k]>0) player.powerups[k]--; });

  // --- player bullets vs enemies (see 10-combat.js for shoot/activateSpecial) ---
  for (let i=bullets.length-1;i>=0;i--) {
    const b=bullets[i];
    b.x+=b.vx; b.y+=b.vy;
    if (b.life!==undefined) { b.life--; if(b.life<=0){bullets.splice(i,1);continue;} }
    if (b.y<-20||b.x<-20||b.x>W+20||b.y>H+20) { bullets.splice(i,1); continue; }
    if (!b.player) continue;

    // ホーミング処理（高負荷時は間引き）
    const homingEvery = getPerformanceTier() >= 2 ? 5 : getPerformanceTier() >= 1 ? 3 : 2;
    if (b.homing && (frameCount + i) % homingEvery === 0 && enemies.length > 0) {
      const hs = getHomingStrength();
      let nearest = null, nd2 = 40000;
      for (let k = 0; k < enemies.length; k++) {
        const e = enemies[k];
        if (e.type === 'stealth' && e.ghost) continue;
        if (e.type === 'boss' && e.invEntry) continue;
        const dx = e.x - b.x, dy = e.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nd2) { nd2 = d2; nearest = e; }
      }
      if (nearest) {
        const dx = nearest.x - b.x, dy = nearest.y - b.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        b.vx += (dx / len) * hs; b.vy += (dy / len) * hs;
        const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
        const tgt = 12 * getBulletSpeedMult();
        b.vx = b.vx / spd * tgt; b.vy = b.vy / spd * tgt;
      }
    }

    let removed = false;
    const bhw = b.w + (b.special ? 8 : 0), bhh = b.h + (b.special ? 8 : 0);
    for (let j=enemies.length-1;j>=0;j--) {
      const e=enemies[j];
      if (e.type==='stealth' && e.ghost) continue;
      if (e.type==='boss' && e.invEntry) continue;
      if (!isNear(b.x, b.y, e.x, e.y, bhw + e.w)) continue;
      if (!rectsOverlap(b.x, b.y, bhw, bhh, e.x, e.y, e.w, e.h)) continue;
      // Titan boss shield absorption
      if (e.type==='boss' && e.bossType==='titan' && e.shieldHp>0) {
        e.shieldHp -= (b.damage||1);
        e.shieldTimer=0;
        spawnParticles(b.x,b.y,5,'#ffcc00',3,15);
        if (!b.special) { bullets.splice(i,1); removed=true; }
        break;
      }
      let hitDmg = b.damage || 1;
      const hpRatio = e.maxHp ? e.hp / e.maxHp : 1;
      hitDmg = Math.floor(hitDmg * getExecuteMult(hpRatio));
      if (e.type === 'boss') hitDmg = Math.floor(hitDmg * getPermBossDamageMult());
      if (getCriticalChance() > 0 && Math.random() < getCriticalChance()) {
        hitDmg *= 2;
        spawnParticles(b.x, b.y, 4, '#ffff00', 3, 12);
      }
      e.hp -= hitDmg;
      e.hitFlash = 8;
      if (upgradeLevels.enemySlow > 0) {
        e.slowTimer = getSlowDuration();
        e.slowMult = getSlowMult();
      }
      // 凍結付与
      if (getFreezeOnHitChance() > 0 && Math.random() < getFreezeOnHitChance()) {
        e.frozen = getFreezeOnHitDur();
      }
      // 通常弾: 貫通または1体で消える / ゲージショットは貫通
      if (!b.special) {
        if ((b.pierceLeft || 0) > 0) b.pierceLeft--;
        else { bullets.splice(i,1); removed=true; }
      }
      if (e.hp<=0) {
        const isBoss = e.type==='boss';
        const bombChance = [0,0.20,0.40,0.65][upgradeLevels.bombOnKill];
        if (bombChance > 0 && Math.random() < bombChance) {
          spawnExplosion(e.x, e.y, false);
          const splashDmg = Math.max(1, Math.floor((b.damage || 1) * 0.5));
          enemies.forEach((ne) => {
            if (ne!==e && Math.hypot(ne.x-e.x,ne.y-e.y)<70) ne.hp -= splashDmg;
          });
        }
        // Splitter: 分裂
        if (e.type==='splitter') spawnMinis(e.x, e.y);
        spawnExplosion(e.x,e.y,isBoss);
        spawnPowerup(e.x,e.y);
        const pts = Math.round(e.score * getScoreMult() * getComboMult() * getPermSalvageMult() * getPlayDifficulty().scoreMult);
        addScorePopup(e.x,e.y,pts);
        score += pts;
        document.getElementById('scoreDisplay').textContent = score.toLocaleString();
        addGauge(getEnemyGaugeGain(e.gaugeGain));
        addGauge(getGaugeOnKill());
        registerComboKill();
        if (getPermKillSpeedFrames() > 0) permKillSpeedTimer = getPermKillSpeedFrames();
        applyChainKill(e.x, e.y, hitDmg, e);
        const hk = getKillHealChance();
        if (hk > 0 && Math.random() < hk && lives < getMaxLives()) {
          lives++;
          updateLivesUI();
          spawnParticles(e.x, e.y, 8, '#ff44aa', 3, 20);
        }
        // score milestone bonus points (every 2000 score)
        if (!debugMode) {
          const newThreshold = Math.floor(score/2000);
          if (newThreshold > _lastScoreThreshold) {
            upgradePoints += newThreshold - _lastScoreThreshold;
            _lastScoreThreshold = newThreshold;
          }
        }
        if (isBoss) {
          bossActive=false; bossRef=null; lastWasBossKill=true;
          document.getElementById('bossHealth').classList.remove('visible');
        }
        Achievements.onEnemyKill(isBoss, e.bossType);
        enemies.splice(j,1);
      }
      break;
    }
  }

  // --- wave clear → shop ---
  if (enemies.length===0 && !bossActive && frameCount>60) {
    showUpgradeScreen(lastWasBossKill);
    lastWasBossKill = false;
    return;
  }

  if (bossRef) document.getElementById('bossBarFill').style.width = `${bossRef.hp/bossRef.maxHp*100}%`;

  // --- enemy AI & movement (spawn: 10-combat.js) ---
  for (let i=enemies.length-1;i>=0;i--) {
    const e=enemies[i];
    e.wobble+=0.04;
    const moveMult = (e.slowTimer > 0) ? (e.slowMult || 0.7) : 1;
    if (e.slowTimer > 0) e.slowTimer--;
    if (e.frozen>0) { e.frozen--; continue; }
    const prevX = e.x, prevY = e.y;

    if (e.type==='boss') {
      // 入場
      e.y+=e.vy; if(e.y>=100)e.vy=0;
      e.x+=e.vx; if(e.x<e.w/2+20||e.x>W-e.w/2-20)e.vx*=-1;

      // 入場中（まだ画面内に完全に入っていない）は無敵・弾幕なし
      const entering = e.y < e.h/2 + 20;
      if (entering) { e.invEntry = true; continue; }
      // 入場完了の瞬間: 警告パーティクルを発生
      if (e.invEntry) {
        spawnParticles(e.x, e.y, 20, '#ff4444', 5, 30);
        e.shootTimer = 0; // 入場直後は少し猶予を与える
      }
      e.invEntry = false;

      e.shootTimer++;
      if (e.hp<e.maxHp*0.5) e.phase=2;
      const ph2 = e.phase===2;
      const bt = e.bossType||'guardian';
      const spd = ph2?1.6:1.1;
      e.vx = Math.sign(e.vx)*spd;

      if (bt==='guardian') {
        // ---- メイン弾幕: 扇形 ----
        const si=Math.max(28,85-level*4);
        if (e.shootTimer%bossTick(si)===0) {
          const spread = ph2 ? 5 : 3;
          const spd = ph2 ? 5.5 : 4.5;
          for (let a=-spread;a<=spread;a++) {
            const ang=Math.atan2(player.y-e.y,player.x-e.x)+a*0.20;
            pushEnemyBullet({x:e.x,y:e.y+e.h/2,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,boss:true});
          }
        }
        // ---- 螺旋バースト: 8方向回転 ----
        e.spiralTimer=(e.spiralTimer||0)+1;
        const spiralInt=Math.max(140,220-level*6);
        if (e.spiralTimer%bossTick(spiralInt)===0) {
          const shots=ph2?12:8;
          for(let s=0;s<shots;s++){
            const a=e.spiralAngle+s*(Math.PI*2/shots);
            pushEnemyBullet({x:e.x,y:e.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,boss:true});
          }
          e.spiralAngle+=Math.PI/shots;
        }
        // ---- フェーズ2: ホーミングミサイル ----
        const homingIv = bossTick(90);
        if (ph2 && e.shootTimer%homingIv===Math.floor(homingIv/2)) {
          const ang=Math.atan2(player.y-e.y,player.x-e.x);
          pushEnemyBullet({x:e.x,y:e.y,vx:Math.cos(ang)*3,vy:Math.sin(ang)*3,boss:true,homing:true,homingLife:120});
        }

      } else if (bt==='swarm') {
        // ---- ミニオン生成 ----
        e.spawnTimer++;
        const sp=Math.max(80,180-level*7);
        const miniOnScreen = enemies.filter(m => m.type === 'mini').length;
        const miniCap = useVisualLite() ? 6 : (_perfTier >= 2 ? 6 : 10);
        if (e.spawnTimer%bossTick(sp)===0 && miniOnScreen < miniCap) {
          const n=ph2?4:2;
          for(let s=0;s<n;s++){
            enemies.push(makeEnemyFromType('mini', e.x+(Math.random()-0.5)*e.w, e.y+e.h/2, (Math.random()-0.5)*2, 1.2+Math.random()));
          }
        }
        // ---- 全方向弾 ----
        const si2=Math.max(50,110-level*4);
        if (e.shootTimer%bossTick(si2)===0) {
          const n=ph2?10:6;
          for(let s=0;s<n;s++){
            const ang=(Math.PI*2/n)*s + (e.shootTimer*0.05);
            pushEnemyBullet({x:e.x,y:e.y,vx:Math.cos(ang)*3.8,vy:Math.sin(ang)*3.8,boss:true});
          }
        }
        // ---- 分裂弾: 着弾後に4方向へ分散 ----
        const si2b=Math.max(100,180-level*6);
        const splitIv = bossTick(si2b);
        if (e.shootTimer%splitIv===Math.floor(splitIv*0.28)) {
          const ang=Math.atan2(player.y-e.y,player.x-e.x);
          pushEnemyBullet({x:e.x,y:e.y,vx:Math.cos(ang)*3.5,vy:Math.sin(ang)*3.5,boss:true,
            split:true, splitTimer:40});
        }

      } else if (bt==='laser') {
        // ---- チャージ→レーザー ----
        e.laserTimer++;
        const cycle=Math.max(110,190-level*5);
        const laserHitFn = (angle) => {
          if (Combat.checkLaser(e.x, e.y, angle, e.h * 0.7)) Combat.applyDamage();
        };
        if (!e.laserActive) {
          const tgt=Math.atan2(player.y-e.y,player.x-e.x);
          e.laserAngle=e.laserAngle||tgt;
          e.laserAngle+=(tgt-e.laserAngle)*0.035;
          if (ph2) { e.laserAngle2=(e.laserAngle+Math.PI); }
          if (e.laserTimer%bossTick(cycle)===0) {
            e.laserActive=true;
            if (ph2) e.laserActive2=true;
            e.laserTimer=0;
          }
          // ショットガンバースト
          const si3=Math.max(38,90-level*4);
          if (e.shootTimer%bossTick(si3)===0) {
            const ang=Math.atan2(player.y-e.y,player.x-e.x);
            const shots=ph2?5:3;
            for(let k=0;k<shots;k++){
              const sc=(k-(shots-1)/2)*0.25;
              pushEnemyBullet({x:e.x,y:e.y,vx:Math.cos(ang+sc)*5.5,vy:Math.sin(ang+sc)*5.5,boss:true});
            }
          }
        } else {
          laserHitFn(e.laserAngle);
          if (e.laserActive2) laserHitFn(e.laserAngle2);
          const laserDur=ph2?55:38;
          if (e.laserTimer>=laserDur) { e.laserActive=false; e.laserActive2=false; e.laserTimer=0; }
        }

      } else if (bt==='titan') {
        // ---- シールド再生 ----
        e.shieldTimer++;
        if (e.shieldHp<=0 && e.shieldTimer>220) { e.shieldHp=e.shieldMax; e.shieldTimer=0; }
        // ---- 重砲撃: 2砲塔 ----
        const si4=Math.max(35,90-level*4);
        if (e.shootTimer%bossTick(si4)===0) {
          [-1,1].forEach(d=>{
            const ox=d*(e.w*0.28);
            const ang=Math.atan2(player.y-e.y,player.x-e.x);
            const scatter=ph2?0.40:0.20;
            const shots=ph2?5:3;
            for(let k=0;k<shots;k++){
              const sc=(k-(shots-1)/2)*scatter/(shots-1||1);
              pushEnemyBullet({x:e.x+ox,y:e.y+e.h/2,
                vx:Math.cos(ang+sc)*4.5,vy:Math.sin(ang+sc)*4.5,boss:true});
            }
          });
        }
        // ---- モルタル弾: プレイヤー位置に遅延着弾 ----
        const mortarInt=Math.max(110,200-level*6);
        if (e.shootTimer%bossTick(mortarInt)===0) {
          const tx=player.x, ty=player.y;
          const travelT=60;
          const vx=(tx-e.x)/travelT, vy=(ty-e.y)/travelT;
          pushEnemyBullet({x:e.x,y:e.y,vx,vy,boss:true,mortar:true,mortarTimer:travelT,
            tx,ty});
        }

      } else if (bt==='phantom') {
        // ---- テレポート ----
        e.teleportTimer=(e.teleportTimer||0)+1;
        const teleInterval=Math.max(120,200-level*5);
        if (!e.teleporting && e.teleportTimer%bossTick(teleInterval)===0) {
          e.teleporting=true;
          e.teleportTimer=0;
        }
        if (e.teleporting) {
          e.phantomAlpha=Math.max(0,(e.phantomAlpha||1)-0.08);
          if ((e.phantomAlpha||1)<=0) {
            // 瞬間移動
            e.x=W*0.2+Math.random()*W*0.6;
            e.y=60+Math.random()*120;
            e.teleporting=false;
            e.phantomAlpha=0;
            spawnParticles(e.x,e.y,12,'#cc44ff',4,25);
          }
        } else {
          e.phantomAlpha=Math.min(1,(e.phantomAlpha||0)+0.06);
        }
        // ---- 螺旋弾幕 ----
        e.spiralAngle2=(e.spiralAngle2||0)+0.06;
        const si5=Math.max(18,40-level*1.5);
        if (e.shootTimer%bossTick(si5)===0 && !e.teleporting) {
          const arms=ph2?4:3;
          for(let a=0;a<arms;a++){
            const ang=e.spiralAngle2+a*(Math.PI*2/arms);
            const spd=ph2?4.5:3.5;
            pushEnemyBullet({x:e.x,y:e.y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,boss:true,phantom:true});
          }
        }
        // ---- ホーミング弾 ----
        e.homingTimer=(e.homingTimer||0)+1;
        const homingInt=Math.max(90,150-level*4);
        if (e.homingTimer%bossTick(homingInt)===0 && !e.teleporting) {
          const shots=ph2?3:1;
          for(let k=0;k<shots;k++){
            const ang=Math.atan2(player.y-e.y,player.x-e.x)+(k-(shots-1)/2)*0.3;
            pushEnemyBullet({x:e.x,y:e.y,vx:Math.cos(ang)*3,vy:Math.sin(ang)*3,
              boss:true,homing:true,homingLife:160});
          }
        }
      }

    } else if (e.type==='sniper') {
      // 上部に留まりながら照準→精密射撃
      if (e.y < 90) e.y += e.vy;
      else e.y = 90 + Math.sin(e.wobble*0.4)*8;
      e.x += Math.sin(e.wobble*0.3)*0.6;
      e.x = Math.max(e.w/2, Math.min(W-e.w/2, e.x));
      e.sniperTimer--;
      if (e.sniperTimer===70) { e.aimX=player.x; e.aimY=player.y; } // ロックオン
      if (e.sniperTimer<=0) {
        e.sniperTimer = 130+Math.floor(Math.random()*60);
        const tx=e.aimX??player.x, ty=e.aimY??player.y;
        const dx=tx-e.x, dy=ty-e.y, len=Math.sqrt(dx*dx+dy*dy);
        pushEnemyBullet({x:e.x,y:e.y,vx:(dx/len)*7,vy:(dy/len)*7,sniper:true});
        e.aimX=null; e.aimY=null;
      }

    } else if (e.type==='zigzag') {
      // 激しいジグザグ
      e.zigzagTimer--;
      if (e.zigzagTimer<=0) { e.vx*=-1; e.zigzagTimer=12+Math.floor(Math.random()*18); }
      e.x += e.vx*3; e.y += e.vy;
      if (e.y>H+60) { enemies.splice(i,1); continue; }
      if (e.x<e.w/2){e.x=e.w/2; e.vx=Math.abs(e.vx);}
      if (e.x>W-e.w/2){e.x=W-e.w/2; e.vx=-Math.abs(e.vx);}
      if (Math.random()<e.shootChance*getLevelShootMult()) {
        const dx=player.x-e.x,dy=player.y-e.y,len=Math.sqrt(dx*dx+dy*dy);
        const spd = 3.5 + getLevelBulletSpeedBonus();
        pushEnemyBullet({x:e.x,y:e.y,vx:(dx/len)*spd,vy:(dy/len)*spd});
      }

    } else if (e.type==='stealth') {
      // 透明化サイクル
      e.x+=e.vx+Math.sin(e.wobble)*0.5; e.y+=e.vy;
      if (e.y>H+60) { enemies.splice(i,1); continue; }
      if (e.x<e.w/2){e.x=e.w/2; e.vx=Math.abs(e.vx);}
      if (e.x>W-e.w/2){e.x=W-e.w/2; e.vx=-Math.abs(e.vx);}
      e.ghostTimer--;
      if (e.ghostTimer<=0) { e.ghost=!e.ghost; e.ghostTimer=e.ghost?50:80; }
      if (!e.ghost && Math.random()<e.shootChance*getLevelShootMult()) {
        const dx=player.x-e.x,dy=player.y-e.y,len=Math.sqrt(dx*dx+dy*dy);
        const spd = 3.5 + getLevelBulletSpeedBonus();
        pushEnemyBullet({x:e.x,y:e.y,vx:(dx/len)*spd,vy:(dy/len)*spd});
      }

    } else if (e.type==='bomber') {
      e.x+=e.vx+Math.sin(e.wobble)*0.4; e.y+=e.vy;
      if (e.y>H+60) { enemies.splice(i,1); continue; }
      if (e.x<e.w/2){e.x=e.w/2; e.vx=Math.abs(e.vx);}
      if (e.x>W-e.w/2){e.x=W-e.w/2; e.vx=-Math.abs(e.vx);}
      e.bombTimer--;
      if (e.bombTimer<=0) {
        e.bombTimer=70+Math.floor(Math.random()*60);
        pushEnemyBullet({x:e.x,y:e.y+e.h/2,vx:0,vy:2.5,bomb:true});
        spawnParticles(e.x,e.y+e.h/2,4,'#ffdd00',2,15);
      }

    } else if (e.type==='charger') {
      if (e.charging) {
        e.y+=e.chargeVy;
        if (e.y>H+40) { enemies.splice(i,1); continue; }
      } else {
        e.x+=e.vx+Math.sin(e.wobble)*0.5; e.y+=e.vy;
        if (e.y>H+60) { enemies.splice(i,1); continue; }
        if (e.x<e.w/2){e.x=e.w/2; e.vx=Math.abs(e.vx);}
        if (e.x>W-e.w/2){e.x=W-e.w/2; e.vx=-Math.abs(e.vx);}
        // 真下に敵がいる & 十分降りてきたら突進開始
        if (Math.abs(e.x-player.x)<50 && e.y>-20 && e.y<player.y-60) {
          e.charging=true; e.chargeVy=10;
          spawnParticles(e.x,e.y,8,'#ff4400',4,20);
        }
        if (Math.random()<e.shootChance*getLevelShootMult()) {
          const dx=player.x-e.x,dy=player.y-e.y,len=Math.sqrt(dx*dx+dy*dy);
          pushEnemyBullet({x:e.x,y:e.y,vx:(dx/len)*3,vy:(dy/len)*3});
        }
      }

    } else {
      // basic / fast / tank / splitter / mini: 標準移動
      e.x+=e.vx+Math.sin(e.wobble)*0.5; e.y+=e.vy;
      if (e.y>H+60) { enemies.splice(i,1); continue; }
      if (e.x<e.w/2){e.x=e.w/2; e.vx=Math.abs(e.vx);}
      if (e.x>W-e.w/2){e.x=W-e.w/2; e.vx=-Math.abs(e.vx);}
      if (Math.random()<(e.shootChance||0)*getLevelShootMult()) {
        const dx=player.x-e.x,dy=player.y-e.y,len=Math.sqrt(dx*dx+dy*dy);
        const spd = 3.5 + getLevelBulletSpeedBonus();
        pushEnemyBullet({x:e.x,y:e.y,vx:(dx/len)*spd,vy:(dy/len)*spd});
      }
    }

    // 体当たり（ゴースト中のstealthと突進中chargerは除く）
    if (moveMult !== 1) {
      e.x = prevX + (e.x - prevX) * moveMult;
      e.y = prevY + (e.y - prevY) * moveMult;
    }
    const skipTouch = (e.type==='stealth'&&e.ghost) || (e.type==='charger'&&!e.charging&&e.y<0);
    if (!skipTouch && Combat.checkEnemyBody(e)) Combat.applyDamage();
  }

  // --- Enemy bullets ---
  for (let i=enemyBullets.length-1;i>=0;i--) {
    const b=enemyBullets[i];
    // ホーミング: プレイヤー方向に少し曲がる
    if (b.homing && b.homingLife>0) {
      b.homingLife--;
      const ang=Math.atan2(player.y-b.y,player.x-b.x);
      const spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
      b.vx+=(Math.cos(ang)-b.vx/spd)*0.18;
      b.vy+=(Math.sin(ang)-b.vy/spd)*0.18;
      const maxSpd=5.5;
      const s=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
      if(s>maxSpd){b.vx=b.vx/s*maxSpd; b.vy=b.vy/s*maxSpd;}
    }
    // モルタル: タイマー終了で着弾爆発
    if (b.mortar) {
      b.mortarTimer=(b.mortarTimer||1)-1;
      if (b.mortarTimer<=0) {
        spawnParticles(b.x,b.y,16,'#ff8800',5,35);
        if (Combat.checkBlast(b.x, b.y, Combat.CFG.mortarBlastR)) Combat.applyDamage();
        // 着弾時に放射状4発
        for(let k=0;k<4;k++){
          const a=k*Math.PI/2;
          pushEnemyBullet({x:b.x,y:b.y,vx:Math.cos(a)*3.5,vy:Math.sin(a)*3.5,boss:true});
        }
        enemyBullets.splice(i,1); continue;
      }
    }
    // 分裂弾
    if (b.split) {
      b.splitTimer=(b.splitTimer||0)-1;
      if (b.splitTimer<=0) {
        if (Combat.checkBlast(b.x, b.y, 16)) Combat.applyDamage();
        for(let k=0;k<4;k++){
          const a=k*Math.PI/2;
          pushEnemyBullet({x:b.x,y:b.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,boss:true});
        }
        enemyBullets.splice(i,1); continue;
      }
    }
    const prevX = b.x, prevY = b.y;
    b.x+=b.vx; b.y+=b.vy;
    if (b.x<0||b.x>W||b.y>H+20) { enemyBullets.splice(i,1); continue; }
    if (b.y<-20 && !b.bomb) { enemyBullets.splice(i,1); continue; }
    // 爆弾: 画面下端で爆発
    if (b.bomb && b.y>=H) {
      spawnParticles(b.x, H, 12, '#ffaa00', 4, 30);
      if (Combat.checkBlast(b.x, H, Combat.CFG.mortarBlastR)) Combat.applyDamage();
      enemyBullets.splice(i,1); continue;
    }
    // プレイヤーへの当たり判定
    if (Combat.checkBullet(b, prevX, prevY)) {
      Combat.applyDamage();
      if (b.bomb) spawnParticles(b.x,b.y,10,'#ffaa00',4,25);
      enemyBullets.splice(i,1);
    }
  }

  // --- Power-ups pickup ---
  for (let i=powerups.length-1;i>=0;i--) {
    const p=powerups[i]; p.y+=p.vy; p.wobble+=0.05;
    const mr = getMagnetRadius();
    if (mr > 0) {
      const dx = player.x - p.x, dy = player.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mr && dist > 4) {
        p.x += (dx / dist) * 3.5;
        p.y += (dy / dist) * 3.5;
      }
    }
    if (p.y>H+20) { powerups.splice(i,1); continue; }
    if (rectsOverlap(player.x,player.y,player.w,player.h,p.x,p.y,p.size*2,p.size*2)) {
      activatePowerup(p.type);
      spawnParticles(p.x,p.y,8,p.type.color,3,20);
      powerups.splice(i,1);
    }
  }

  // --- Bomb aftermath: remove hp<=0 enemies ---
  for (let i=enemies.length-1;i>=0;i--) {
    if (enemies[i].hp<=0) {
      spawnExplosion(enemies[i].x,enemies[i].y);
      const bombPts = Math.round(enemies[i].score * getPlayDifficulty().scoreMult);
      addScorePopup(enemies[i].x,enemies[i].y,bombPts);
      score+=bombPts;
      addGauge(getEnemyGaugeGain(enemies[i].gaugeGain));
      addGauge(getGaugeOnKill());
      document.getElementById('scoreDisplay').textContent=score.toLocaleString();
      enemies.splice(i,1);
    }
  }

  // --- Particles ---
  for (let i=particles.length-1;i>=0;i--) {
    const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vx*=0.96; p.vy*=0.96; p.life--;
    if (p.life<=0) particles.splice(i,1);
  }

  if (doUI && frameCount % 8 === 0) updateUI();
  if (doUI && (frameCount % 4 === 0 || isGaugeBlocked())) updateGaugeUI();

  Combat.tick();
}

// ===== DRAW / RENDER =====
function draw() {
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle='#00000f'; ctx.fillRect(0,0,W,H);
  drawStars();
  if (nebulaGrad1 && !useVisualLite()) {
    ctx.save(); ctx.globalAlpha=0.04;
    ctx.fillStyle=nebulaGrad1; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=nebulaGrad2; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  ctx.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (useVisualLite()) {
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.player && !b.special) drawBullet(b);
  }
  for (let i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
  for (let i = 0; i < powerups.length; i++) {
    const p = powerups[i];
    p.x += Math.sin(p.wobble) * 0.3;
    drawPowerup(p);
  }
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (b.player && b.special) drawBullet(b);
  }
  for (let i = 0; i < enemyBullets.length; i++) drawEnemyBullet(enemyBullets[i]);
  drawPlayer();
  if (!useVisualLite()) drawPlayerHitbox(player.x, player.y);
  drawOrbitGuard();
  drawComboHUD();
  drawLevelText();
  drawScorePopups();
  Combat.drawPopups();
  // Speed / lite badge
  if (gameSpeed>=2 || useVisualLite()) {
    const parts = [];
    if (useVisualLite()) parts.push('LITE');
    if (gameSpeed>=2) parts.push(`x${gameSpeed}`);
    const label = parts.join(' ');
    const color = gameSpeed===4 ? '#ff5555' : useVisualLite() ? '#ffdd66' : '#ffdd00';
    const fa = gameSpeed===4 ? (0.7+0.3*Math.sin(frameCount*0.3)) : 0.65;
    ctx.save(); ctx.globalAlpha=fa; ctx.font='bold 13px Courier New';
    ctx.fillStyle=color; ctx.textAlign='right'; ctx.shadowColor=color; ctx.shadowBlur=10;
    ctx.fillText(label, W-8, 76); ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ===== GAME STATE (start / end) =====
function startGame(fromDebug = false) {
  if (!fromDebug && !activeProfileId) {
    openProfileOverlay(true);
    return;
  }
  if (!fromDebug) debugMode = false;
  if (!fromDebug) debugInvincible = false;
  ScreenUI.prepareForPlay();
  state='playing';
  playDifficultyId = difficultyId;
  score=0; highscore=highscoresByDiff[playDifficultyId] || 0; level=1; frameCount=0;
  comboCount=0; comboTimer=0; permKillSpeedTimer=0;
  orbitGuardCooldowns.fill(0);
  const diff = getPlayDifficulty();
  lives = diff.fixedLives != null
    ? diff.fixedLives
    : Math.max(1, 3 + permLv('extraLife') + diff.lifeBonus);
  applyPlayerHitRadius();
  Achievements.resetRun();
  specialGauge=0; specialCooldownUntil=0; upgradePoints=0; _lastScoreThreshold=0; lastWasBossKill=false;
  if (!fromDebug) Object.keys(upgradeLevels).forEach(k => upgradeLevels[k]=0);
  currentWaveUpgrades = []; rerollsLeft = 2; shieldRechargeTimer = 0; shopPurchasedIds = new Set();
  player.x=W/2; player.y=H-90; player.invincible=0;
  player.powerups={multishot:0,shield:0,rapid:0,laser:0,freeze:0};
  player.shootCooldown=0;
  enemies.length=0; bullets.length=0; enemyBullets.length=0;
  powerups.length=0; particles.length=0; scorePopups.length=0;
  bossActive=false; bossRef=null;
  document.getElementById('bossHealth').classList.remove('visible');
  document.getElementById('scoreDisplay').textContent='0';
  if (fromDebug) {
    applyDebugSettings();
  } else {
    showDebugBadge(false);
    applyStartGaugeFill();
    if (permLv('startShield') >= 1) player.powerups.shield = 1;
    if (permLv('startShield') >= 2) Combat.grantIFrames(120);
    if (permLv('startShield') >= 4) Combat.grantIFrames(180);
    const laserDur = getStartPowerupDuration('startLaser');
    if (laserDur > 0) player.powerups.laser = laserDur;
    const rapidDur = getStartPowerupDuration('startRapid');
    if (rapidDur > 0) player.powerups.rapid = rapidDur;
  }
  permArmorUsed = 0;
  shieldRechargeTimer = getEffectiveShieldRechargeInterval() || 0;
  updateLivesUI(); updateGaugeUI();
  resetTouchStick();
  touchInput.fire = false;
  updateTouchControlsVisibility();
  spawnWave(); showLevelText();
  if (!fromDebug) Sfx.play('start', true);
}

function endGame() {
  state='gameover';
  Sfx.play('gameOver', true);
  resetTouchStick();
  touchInput.fire = false;
  updateTouchControlsVisibility();
  ScreenUI.close('upgrade');
  if (debugMode) {
    showDebugBadge(false);
    ScreenUI.open('title');
    document.getElementById('overlayTitle').textContent = 'DEBUG OVER';
    document.getElementById('overlaySub').textContent = `SCORE ${score.toLocaleString()}（記録なし）`;
    document.getElementById('overlayScore').classList.add('hidden');
    document.getElementById('overlayHighscore').classList.add('hidden');
    document.getElementById('startBtn').textContent = 'スタート';
    debugMode = false;
    debugInvincible = false;
    return;
  }
  if (score > highscore) {
    highscore = score;
    highscoresByDiff[playDifficultyId] = score;
  }
  saveHighscore();
  recordWeeklyScore(score, playDifficultyId);
  Achievements.onGameOver();
  const earned = Math.max(1, Math.min(20, Math.round(Math.floor(score / 1500) * getPlayDifficulty().ptMult)));
  recordHardWaveProgress();
  permPoints += earned;
  savePerm();
  setTimeout(() => showPermTree(earned), 600);
}

// ===== GAME LOOP =====
function gameLoop() {
  refreshPerfTier();
  if (state==='playing') {
    for (let i=0;i<gameSpeed;i++) {
      update(i===gameSpeed-1);
      if (i < gameSpeed - 1) refreshPerfTier();
    }
  }
  draw();
  requestAnimationFrame(gameLoop);
}

