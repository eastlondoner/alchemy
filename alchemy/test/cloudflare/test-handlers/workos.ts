import { WorkOS } from "@workos-inc/node";

export default {
  async fetch(_request: Request) {
    const _workos = new WorkOS("sk_test_1234567890");

    return new Response(null, { status: 204 });
  },
};
