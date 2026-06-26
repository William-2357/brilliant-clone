import type { Kernel } from '../../../src/content/generated/kernels';

export function checkArgs(kernel: Kernel, args: number[]): string[] {
  const issues: string[] = [];
  if (kernel.name === 'expectedValueWheel') {
    if (args.length < 4 || args.length % 2 !== 0) issues.push('wheel: need an even number of (value,p) args >= 4');
    let psum = 0;
    for (let i = 1; i < args.length; i += 2) { psum += args[i]; if (args[i] < 0) issues.push('wheel: negative probability'); }
    if (Math.abs(psum - 1) > 1e-6) issues.push(`wheel: probabilities sum to ${psum}, not 1`);
    return issues;
  }
  if (args.length !== kernel.args.length) {
    issues.push(`expected ${kernel.args.length} args, got ${args.length}`);
    return issues;
  }
  kernel.args.forEach((spec, i) => {
    const v = args[i];
    if (!Number.isFinite(v)) { issues.push(`${spec.name} is not finite`); return; }
    if (spec.kind === 'int' && !Number.isInteger(v)) issues.push(`${spec.name} must be an integer`);
    if (spec.kind === 'enum') { if (!spec.values!.includes(v)) issues.push(`${spec.name}=${v} not in ${spec.values}`); return; }
    if (spec.min !== undefined && v < spec.min) issues.push(`${spec.name}=${v} < ${spec.min}`);
    if (spec.max !== undefined && v > spec.max) issues.push(`${spec.name}=${v} > ${spec.max}`);
  });
  return issues;
}

export function computeAnswer(kernel: Kernel, args: number[]): number {
  return kernel.fn(...args);
}
