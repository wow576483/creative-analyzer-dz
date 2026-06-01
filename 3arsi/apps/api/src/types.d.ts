// Allow importing the embedded TTF font as binary (wrangler "Data" loader).
declare module '*.ttf' {
  const content: ArrayBuffer;
  export default content;
}
