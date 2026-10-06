declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

declare module 'qrcode' {
  const qrcode: any;
  export default qrcode;
}
