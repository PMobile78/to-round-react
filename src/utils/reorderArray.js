export const reorderArray = (list, startIndex, endIndex) => {
    const result = Array.isArray(list) ? [...list] : [];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};


