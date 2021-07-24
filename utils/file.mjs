export const fileNameGenerator = ({ name }) => {
  const d = new Date().toISOString().replace("T", " ");
  if (name) {
    return `${d} ${name}.png`;
  }
  return `${d}.png`;
};
