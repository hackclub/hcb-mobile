import { Middleware, SWRHook, mutate, useSWRConfig } from "swr";

const listPreloader = <T>(keyGenerator: (d: T) => string): Middleware => {
  return (useSWRNext: SWRHook) => (key, fetcher, config) => {
    const swr = useSWRNext(key, fetcher, config);
    const { cache } = useSWRConfig();

    if (swr.data && swr.data instanceof Array) {
      swr.data.forEach((d) => {
        const key = keyGenerator(d);
        if (!cache.get(key)?.data) {
          mutate(key, d);
        }
      });
    }

    return swr;
  };
};

export default listPreloader;
