// console.log("Communities script loaded");

const hNav = document.querySelector(".h-nav-scroll");

let isDown = false;
let startX, scrollLeftStart;

hNav.addEventListener("mousedown", (e) => {
  isDown = true;
  startX = e.pageX - hNav.offsetLeft;
  scrollLeftStart = hNav.scrollLeft;
  e.preventDefault();
});

window.addEventListener("mouseup", () => (isDown = false));

window.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  const x = e.pageX - hNav.offsetLeft;
  const walk = (x - startX) * 1;
  hNav.scrollLeft = scrollLeftStart - walk;
});

// keyboard arrows
hNav.tabIndex = 0;
hNav.addEventListener("keydown", (e) => {
  const SCROLL_AMOUNT = 160;
  if (e.key === "ArrowRight") hNav.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
  if (e.key === "ArrowLeft") hNav.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
});
