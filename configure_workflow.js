const { configureWorkflow } = await import('@replit/workflows');
await configureWorkflow({
  name: "Start application",
  command: "npm run dev",
  primary: true
});
console.log("Workflow configured successfully");
