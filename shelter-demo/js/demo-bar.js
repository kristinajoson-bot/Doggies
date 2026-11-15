// DEMO ONLY: switch between the shelter's view and the FurSteps admin view.
(function () {
  document.querySelectorAll('.demobar [data-view]').forEach(function (b) {
    b.classList.toggle('on', b.dataset.view === window.DEMO.role());
    b.addEventListener('click', function () { window.DEMO.view(b.dataset.view); });
  });
  document.querySelector('.demobar [data-reset]').addEventListener('click', function () { window.DEMO.reset(); });
  var e = document.getElementById('email'); if (e) e.value = 'you@demopawsrescue.org.au';
})();
