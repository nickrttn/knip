import parseArgs from 'minimist';
import type { ParsedArgs } from 'minimist';
import { compact } from '../../util/array.js';
import { toBinary } from '../../util/protocols.js';
import type { Resolver } from '../types.js';
import { tryResolveFilePath, tryResolveSpecifiers } from '../util.js';

type ArgResolver = (parsed: ParsedArgs) => string[];
type ArgResolvers = Record<string, ArgResolver>;

const withPositional: ArgResolver = parsed => [parsed._[0], parsed.require].flat();
const withoutPositional: ArgResolver = parsed => [parsed.require].flat();
const withoutRequire: ArgResolver = () => [];

const argFilters: ArgResolvers = {
  adb: withoutRequire,
  deploy: withoutRequire,
  'babel-node': withPositional,
  esbuild: withPositional,
  execa: withPositional,
  vitest: withoutRequire,
  'vite-node': withPositional,
  zx: withPositional,
  default: withoutPositional,
};

// Binaries that spawn a child process for the binary at first positional arg (and don't have custom resolver already)
const spawningBinaries = ['cross-env', 'retry-cli'];

export const resolve: Resolver = (binary, args, { cwd, fromArgs }) => {
  const parsed = parseArgs(args, { string: ['r'], alias: { require: ['r', 'loader'] }, boolean: ['quiet', 'verbose'] });
  const bin = binary.startsWith('.') ? tryResolveFilePath(cwd, binary) : toBinary(binary);
  const filteredArgs = binary in argFilters ? argFilters[binary](parsed) : argFilters.default(parsed);
  const shiftedArgs = spawningBinaries.includes(binary) ? fromArgs(args) : [];
  return compact([bin, ...tryResolveSpecifiers(cwd, filteredArgs), ...shiftedArgs]);
};
