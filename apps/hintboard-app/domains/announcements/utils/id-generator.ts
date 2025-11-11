export const generateId = () => {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
