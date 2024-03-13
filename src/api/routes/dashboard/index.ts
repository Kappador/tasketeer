export default {
  get: () => {
    /**
     * Response to
     * @endpoint /dashboard
     * @endpoint /dashboard/
     * @endpoint /dashboard/index
     */
    return new Response(
      JSON.stringify({ message: "dashboard coming soon..." }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
};
