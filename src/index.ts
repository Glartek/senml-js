export const ErrVersionChange = { name: 'ErrVersionChange', message: 'version change' };
export const ErrUnsuportedFormat = { name: 'ErrUnsupportedFormat', message: 'unsupported format' };
export const ErrEmptyName = { name: 'ErrEmptyName', message: 'empty name' };
export const ErrTooManyValues = { name: 'ErrTooManyValues', message: 'more than one value in the record' };
export const ErrNoValues = { name: 'ErrNoValues', message: 'no value or sum field found' };
export const ErrBadChar = { name: 'ErrBadChar', message: 'invalid char' };

const defaultVersion = 10;

// Record represents one senML record.
export interface Record {
  /** Link */
  l?: string;
  /** BaseName */
  bn?: string;
  /** BaseTime */
  bt?: number;
  /** BaseUnit */
  bu?: string;
  /** BaseVersion */
  bver?: number;
  /** BaseValue */
  bv?: number;
  /** BaseSum */
  bs?: number;
  /** Name */
  n?: string;
  /** Unit */
  u?: string;
  /** Time */
  t?: number;
  /** Update Time */
  ut?: number;
  /** Value */
  v?: number;
  /** StringValue */
  vs?: string;
  /** DataValue */
  vd?: string;
  /** BoolValue */
  vb?: boolean;
  /** Sum */
  s?: number;
  // XMLName?: boolean;
}

export enum Format {
  JSON = 1,
  XML,
  CBOR,
}

// Pack consists of SenML records array.
export interface Pack {
  XMLName?: boolean;
  Xmlns?: string;
  Records: Record[];
}

// Encode takes a SenML Pack and encodes it using the given format.
export function Decode(msg: string, format: Format): Pack | Error {
  const p: Pack = { Records: [] };
  switch (format) {
    case Format.JSON:
      p.Records = JSON.parse(msg);
      break;
    default:
      return ErrUnsuportedFormat;
  }

  const err = Validate(p);
  if (err !== null) {
    return err;
  }

  return p;
}

// Encode takes a SenML Pack and encodes it using the given format.
export function Encode(p: Pack, format: Format): string | Error {
  switch (format) {
    case Format.JSON:
      return JSON.stringify(p.Records);
    default:
      return ErrUnsuportedFormat;
  }
}

// Normalize removes all the base values and expands records values with the base items.
// The base fields apply to the entries in the Record and also to all Records after
// it up to, but not including, the next Record that has that same base field.
export function Normalize(p: Pack): Pack | Error {
  const err = Validate(p);
  if (err !== null) {
    return err;
  }

  let bname = '';
  let btime: number | undefined = 0;
  let bsum: number | undefined = 0;
  let bunit: string | undefined = '';

  const records: Array<Record> = [];

  for (const r of p.Records) {
    if (r.bt && r.bt !== 0) btime = r.bt;
    if (r.bs && r.bs !== 0) bsum = r.bs;
    if (r.bu && r.bu !== '') bunit = r.bu;
    if (r.bn && r.bn.length > 0) bname = r.bn;
    
    r.t = (r.t !== undefined && r.t !== null ? r.t : 0) + btime;
    r.n = bname + (r.n !== undefined && r.n !== null ? r.n : '');

    if (r.s && bsum) r.s = bsum + r.s;
    if ((!r.u || r.u === '') && bunit) r.u = bunit;
    if (r.v && r.bv && r.bv !== 0) r.v = r.bv + r.v;

    // If the version is default, it must not be present in resolved records.
    // Validate method takes care that the version is the same on all the records.
    if (r.bv === defaultVersion) r.bv = 0;

    // Remove Base Values from the Record.
    r.bt = 0;
    r.bv = 0;
    r.bu = '';
    r.bn = '';
    r.bs = 0;

    // Add to the SenML array
    records.push(r);
  }

  p.Records = records;

  // TODO: Need to sort

  return p;
}

// Validate validates SenML records.
export function Validate(p: Pack): Error | null {
  let bver: number | undefined = 0;
  let bname = '';
  let bsum = 0;

  for (const r of p.Records) {
    // Check if version is the same for all the records.
    if ((!bver || bver === 0) && r.bver && r.bver !== 0) {
      bver = r.bver;
    }
    if (bver !== 0 && (!r.bver || r.bver === 0)) {
      r.bver = bver;
    }
    if (r.bver && r.bver !== bver) {
      return ErrVersionChange;
    }

    if (r.bn && r.bn !== '') bname = r.bn;
    if (r.bs && r.bs !== 0) bsum = r.bs;

    const name = bname + r.n;
    if (name.length === 0) return ErrEmptyName;

    let valCnt = 0;
    if (r.v) valCnt++;
    if (r.vb) valCnt++;
    if (r.vd) valCnt++;
    if (r.vs) valCnt++;

    if (valCnt > 1) return ErrTooManyValues;
    if (r.s || bsum !== 0) valCnt++;
    if (valCnt < 1) return ErrNoValues;

    const err = validateName(name);
    if (err != null) {
      return err;
    }
  }
  return null;
}

function validateName(name: string): Error | null {
  const l = name[0];
  if (l === '-' || l === ':' || l === '.' || l === '/' || l === '_') {
    return ErrBadChar;
  }

  for (const l of name) {
    if (
      (l < 'a' || l > 'z') &&
      (l < 'A' || l > 'Z') &&
      (l < '0' || l > '9') &&
      l !== '-' &&
      l !== ':' &&
      l !== '.' &&
      l !== '/' &&
      l !== '_'
    ) {
      return ErrBadChar;
    }
  }
  return null;
}
