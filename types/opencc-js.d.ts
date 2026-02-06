declare module "opencc-js" {
  interface ConverterOptions {
    from: string
    to: string
  }

  // The Converter function returns a function that takes a string
  // and returns the converted string.
  export function Converter(options: ConverterOptions): (text: string) => string
}


