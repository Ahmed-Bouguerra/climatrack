const date = new Date('2026-03-02'); // Example date

console.log('Original date:', date);
console.log('Using toISOString().split("T")[0]:', date.toISOString().split('T')[0]);
console.log('Using local components:');
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;
console.log(dateStr);
