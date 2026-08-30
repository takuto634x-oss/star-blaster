from pathlib import Path

root = Path(__file__).resolve().parent
path = root / 'game.html'
text = (root / 'deploy' / 'game.html').read_text(encoding='utf-8')

old = """      if (CloudSync.isEnabled()) {
        await CloudSync.submitFeedback(payload);
      } else {
        const list = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]');
        list.unshift({ id: 'local_' + Date.now(), ...payload });
        localStorage.setItem(FEEDBACK_LOCAL_KEY, JSON.stringify(list.slice(0, 100)));
      }
      Sfx.play('ui', true);
      okEl?.classList.remove('hidden');
      document.getElementById('feedbackText').value = '';
      setTimeout(() => closeOverlay(), 1200);
    } catch (e) {
      errEl.textContent = '送信に失敗しました。あとでもう一度お試しください。';
    }
  }

  async function listAll() {
    if (CloudSync.isEnabled()) {
      try {
        return await CloudSync.listFeedback();
      } catch (e) {
        return [];
      }
    }
    try {
      return JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }"""

new = """      if (okEl) okEl.textContent = '送信しました。ありがとうございます！';
      if (CloudSync.isEnabled()) {
        try {
          await CloudSync.submitFeedback(payload);
        } catch (cloudErr) {
          console.warn('feedback cloud failed', cloudErr);
          const list = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]');
          list.unshift({ id: 'local_' + Date.now(), ...payload });
          localStorage.setItem(FEEDBACK_LOCAL_KEY, JSON.stringify(list.slice(0, 100)));
          if (okEl) okEl.textContent = '送信しました（クラウド未設定のためこの端末に保存）';
          Sfx.play('ui', true);
          okEl?.classList.remove('hidden');
          document.getElementById('feedbackText').value = '';
          setTimeout(() => closeOverlay(), 1400);
          return;
        }
      } else {
        const list = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]');
        list.unshift({ id: 'local_' + Date.now(), ...payload });
        localStorage.setItem(FEEDBACK_LOCAL_KEY, JSON.stringify(list.slice(0, 100)));
      }
      Sfx.play('ui', true);
      okEl?.classList.remove('hidden');
      document.getElementById('feedbackText').value = '';
      setTimeout(() => closeOverlay(), 1200);
    } catch (e) {
      errEl.textContent = '送信に失敗しました。あとでもう一度お試しください。';
    }
  }

  async function listAll() {
    let local = [];
    try { local = JSON.parse(localStorage.getItem(FEEDBACK_LOCAL_KEY) || '[]'); } catch (e) {}
    if (CloudSync.isEnabled()) {
      try {
        const cloud = await CloudSync.listFeedback();
        const merged = [...cloud];
        local.forEach(item => {
          if (!merged.some(m => m.id === item.id)) merged.push(item);
        });
        merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return merged.slice(0, 100);
      } catch (e) {
        return local;
      }
    }
    return local;
  }"""

if old not in text:
    raise SystemExit('patch target not found')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
(root / 'deploy' / 'game.html').write_text(text, encoding='utf-8')
print('patched ok')
