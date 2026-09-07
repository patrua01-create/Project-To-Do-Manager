declare module 'passport-google-oauth20' {
  export class Strategy {}
}

declare module 'passport-github2' {
  export class Strategy {}
}

declare module 'cookie-parser' {
  function cookieParser(secret?: string | string[], options?: any): any;
  export default cookieParser;
}
