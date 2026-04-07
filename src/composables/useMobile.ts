import { ref, onMounted, onUnmounted } from 'vue';

export function useMobile(breakpoint = 991) {
  const mediaQueryString = `(max-width: ${breakpoint}px)`;
  const mediaQueryList = window.matchMedia(mediaQueryString);
  const isMobile = ref(mediaQueryList.matches);

  function updateIsMobile(e: any) {
    isMobile.value = e.matches;
  }

  onMounted(() => {
    mediaQueryList.addEventListener('change', updateIsMobile);
  });

  onUnmounted(() => {
    mediaQueryList.removeEventListener('change', updateIsMobile);
  });

  return isMobile;
}
