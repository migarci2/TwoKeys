const CLOUD_RUN_ORIGIN = "twokeys-352426537968.europe-west1.run.app";

export default {
  async fetch(request) {
    const upstream = new URL(request.url);
    upstream.protocol = "https:";
    upstream.hostname = CLOUD_RUN_ORIGIN;

    const forwarded = new Request(upstream, request);
    forwarded.headers.set("x-forwarded-host", "twokeys.migarci2.dev");
    forwarded.headers.set("x-forwarded-proto", "https");
    return fetch(forwarded);
  },
};
