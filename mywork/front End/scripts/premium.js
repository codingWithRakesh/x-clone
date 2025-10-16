// Add active class to clicked boxes
document.addEventListener("DOMContentLoaded", function () {
  const boxes = document.querySelectorAll('.greybox .box');

  boxes.forEach(box => {
    box.addEventListener('click', function () {
      boxes.forEach(b => b.classList.remove('active')); // remove active from all
      this.classList.add('active'); // add active to clicked one
    });
  });
});


// onclick blue border and shadow
// const card = document.querySelector('.pricing-card');

// card.onclick = function() {
//   card.style.boxShadow = '0 0 0 2px #00b0f4';
// };
