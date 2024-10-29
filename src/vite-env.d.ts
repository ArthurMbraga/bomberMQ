/// <reference types="vite/client" />

import 'kaplay/global'

declare module '*.png' {
  const src: string
  export default src
}