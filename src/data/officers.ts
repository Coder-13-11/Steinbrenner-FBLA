export interface Officer { name: string; role: string; photo: string; adviser?: boolean }

/** 2025–26 leadership team. Photos live in public/assets/officers. */
export const OFFICERS: Officer[] = [
  { name: 'Satvik Randive', role: 'President', photo: '/assets/officers/satvik-randive.jpg' },
  { name: 'Shlok Tandlekar', role: 'Vice President of Marketing', photo: '/assets/officers/shlok-tandlekar.jpg' },
  { name: 'Ankita Dutta', role: 'Vice President of Community Service', photo: '/assets/officers/ankita-dutta.jpg' },
  { name: 'Rhea Kewalramani', role: 'Treasurer', photo: '/assets/officers/rhea-kewalramani.jpg' },
  { name: 'Vera Suri', role: 'Secretary', photo: '/assets/officers/vera-suri.jpg' },
  { name: 'Karthikeya', role: 'Webmaster', photo: '/assets/officers/karthikeya.jpeg' },
  { name: 'Aziz Shakruwala', role: 'Parliamentarian', photo: '/assets/officers/aziz-shakruwala.jpg' },
  { name: 'Ayati Kotha', role: 'Historian', photo: '/assets/officers/ayati-kotha.jpg' },
  { name: 'Manasvi Komaragiri', role: 'Reporter', photo: '/assets/officers/manasvi-komaragiri.jpg' },
];

export const ADVISER: Officer = { name: 'Allison Cuffaro', role: 'Chapter Adviser', photo: '/assets/officers/allison-cuffaro.png', adviser: true };
