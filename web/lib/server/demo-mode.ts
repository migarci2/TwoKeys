interface DemoEnvironment {
  TWOKEYS_PUBLIC_DEMO?: string;
  EXECUTOR_MODE?: string;
}

export function publicDemoMode(env?: DemoEnvironment): boolean {
  const source = env ?? {
    TWOKEYS_PUBLIC_DEMO: process.env.TWOKEYS_PUBLIC_DEMO,
    EXECUTOR_MODE: process.env.EXECUTOR_MODE,
  };
  return source.TWOKEYS_PUBLIC_DEMO === "true" && source.EXECUTOR_MODE === "simulated";
}
