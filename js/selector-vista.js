(() => {
 'use strict';
 const menu = document.querySelector('.selector-menu');
 try { menu.open = localStorage.getItem('thaily-menu-minimizado') !== '1'; } catch (_) {}
 menu.addEventListener('toggle', () => {
   try { localStorage.setItem('thaily-menu-minimizado', menu.open ? '0' : '1'); } catch (_) {}
 });
 const modal = document.getElementById('photoModal');
 const button = document.getElementById('btnPhotoView');
 const setExpanded = expanded => {
   modal.classList.toggle('photo-expanded', expanded);
   button.textContent = expanded ? 'Mostrar opciones de selección' : 'Maximizar foto';
   button.setAttribute('aria-expanded', String(!expanded));
 };
 setExpanded(true);
 button.addEventListener('click', () => setExpanded(!modal.classList.contains('photo-expanded')));
 let wasOpen = modal.classList.contains('active');
 new MutationObserver(() => {
   const isOpen = modal.classList.contains('active');
   if (wasOpen && !isOpen) setExpanded(true);
   wasOpen = isOpen;
 }).observe(modal, { attributes:true, attributeFilter:['class'] });
})();
