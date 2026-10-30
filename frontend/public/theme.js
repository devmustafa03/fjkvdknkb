// Runs before paint: dark users never see a white flash
try {
  var saved = localStorage.getItem('windsight-theme')
  if (saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
} catch {}
