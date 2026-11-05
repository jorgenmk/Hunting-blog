type GalleryPhoto = {
  id: string;
  full: string;
  caption: string;
  n: number;
};

export function mountGallery(): void {
  const root = document.querySelector<HTMLElement>('[data-gallery]');
  if (!root || root.dataset.ready === '1') return;
  root.dataset.ready = '1';
  const photos = JSON.parse(root.dataset.photos || '[]') as GalleryPhoto[];
  const dialog = root.querySelector('dialog');
  const image = dialog?.querySelector('img');
  const caption = dialog?.querySelector('figcaption');
  if (!dialog || !image || !caption) return;

  let index = 0;

  const show = (next: number) => {
    if (photos.length === 0) return;
    index = (next + photos.length) % photos.length;
    const photo = photos[index];
    image.src = photo.full;
    image.alt = photo.caption;
    caption.textContent = `${photo.n}. ${photo.caption}`;
    if (!dialog.open) dialog.showModal();
  };

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const focus = target.closest<HTMLElement>('[data-focus-photo]');
    const open = target.closest<HTMLElement>('[data-open-lightbox]');
    if (focus?.dataset.focusPhoto) {
      window.dispatchEvent(
        new CustomEvent('jaktlogg:focus-photo', { detail: { photoId: focus.dataset.focusPhoto } }),
      );
    }
    if (open?.dataset.openLightbox) {
      const photoIndex = photos.findIndex((photo) => photo.id === open.dataset.openLightbox);
      if (photoIndex >= 0) show(photoIndex);
    }
  });

  window.addEventListener('jaktlogg:open-lightbox', (event) => {
    const photoId = (event as CustomEvent<{ photoId?: string }>).detail?.photoId;
    const photoIndex = photos.findIndex((photo) => photo.id === photoId);
    if (photoIndex >= 0) show(photoIndex);
  });

  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index - 1);
    }
  });
}
