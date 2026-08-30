const menuToggle=document.querySelector('#menuToggle');
const mainNav=document.querySelector('#mainNav');
if(menuToggle&&mainNav){
  menuToggle.addEventListener('click',()=>{
    const open=mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded',String(open));
    menuToggle.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');
  });
  mainNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded','false');
  }));
}
document.querySelectorAll('[data-year]').forEach(node=>node.textContent=String(new Date().getFullYear()));
