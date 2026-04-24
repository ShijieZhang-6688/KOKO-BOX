/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>
  export default component
}

declare module 'lottie-miniprogram' {
  interface LottieAnimation {
    play?: () => void
    stop?: () => void
    destroy?: () => void
  }

  interface LottieModule {
    setup: (canvas: unknown) => void
    loadAnimation: (options: Record<string, unknown>) => LottieAnimation
  }

  const lottie: LottieModule
  export default lottie
}
