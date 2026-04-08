import { ref, onMounted, onUnmounted } from 'vue';

export function useMobile(breakpoint = 990) {
  const mediaQueryString = `(max-width: ${breakpoint}px)`;
  const mediaQueryList = window.matchMedia(mediaQueryString);
  const isMobile = ref(mediaQueryList.matches);

  function updateIsMobile(e: MediaQueryListEvent) {
    isMobile.value = e.matches;
  }

  onMounted(() => {
    mediaQueryList.addEventListener('change', updateIsMobile as EventListener);
  });

  onUnmounted(() => {
    mediaQueryList.removeEventListener('change', updateIsMobile as EventListener);
  });

  return isMobile;
}
