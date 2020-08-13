import { isLeft } from 'fp-ts/lib/Either'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/lib/PathReporter'

export function decodeOrNull<I, A>(codec: t.Decoder<I, A>, value: I) {
  const result = codec.decode(value)

  if (isLeft(result)) {
    return null
  }

  return result.right
}

export class CodecValidationError extends Error {
  constructor(
    codec: { name: string },
    // Being 'public' means this will be sent to Sentry which is useful for debugging.
    public readonly errors: ReadonlyArray<string>,
  ) {
    super(`Value violates codec: ${codec.name}`)
  }
}

export function decodeOrThrow<I, A>(codec: t.Decoder<I, A>, value: I) {
  const result = codec.decode(value)

  if (isLeft(result)) {
    throw new CodecValidationError(codec, PathReporter.report(result))
  }

  return result.right
}

export class EnumCodec<A> extends t.Type<A> {
  public readonly _tag = 'EnumCodec' as const

  public constructor(public readonly enumObject: object, name = 'enum') {
    super(
      name,
      (u): u is A => Object.values(this.enumObject).some((v) => v === u),
      (u, c) => (this.is(u) ? t.success(u) : t.failure(u, c)),
      t.identity,
    )
  }
}

export enum ImportMode {
  all = 'all',
  db = 'db',
  shapes = 'shapes',
  unzip = 'unzip',
  download = 'download',
  export = 'export',
  fullshapes = 'fullshapes',
}

export const ImportModeCodec = new EnumCodec<ImportMode>(ImportMode)

export enum StorageService {
  aws = 'aws',
  local = 'local',
}

export const StorageServiceCodec = new EnumCodec<StorageService>(StorageService)

export enum KeyValue {
  dynamo = 'dynamo',
}

export const KeyValueCodec = new EnumCodec<KeyValue>(KeyValue)

export enum Prefix {
  'au-mel' = 'au-mel',
  'au-per' = 'au-per',
  'au-seq' = 'au-seq',
  'au-syd' = 'au-syd',
  'ch-sfr' = 'ch-sfr',
  'fr-par' = 'fr-par',
  'nz-akl' = 'nz-akl',
  'nz-chc' = 'nz-chc',
  'nz-otg' = 'nz-otg',
  'nz-wlg' = 'nz-wlg',
  'au-cbr' = 'au-cbr',
  'us-bos' = 'us-bos',
  'us-chi' = 'us-chi',
  'us-sfo' = 'us-sfo',
  'us-lax' = 'us-lax',
  'us-nyc' = 'us-nyc',
}

export const PrefixCodec = new EnumCodec<Prefix>(Prefix)

export function exhausted(_: never): never {
  throw new Error('Unexpected control flow.')
}
