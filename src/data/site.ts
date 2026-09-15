/** Chapter-wide constants. Edit here, not in components. */
export const SITE = {
  name: 'Steinbrenner FBLA',
  fullName: 'Steinbrenner High School FBLA',
  tagline: 'Future Business Leaders of America',
  school: 'Steinbrenner High School',
  city: 'Lutz, Florida',
  district: 'Hillsborough County Public Schools',
  schoolYear: '2026–27',
  instagram: 'steinfbla',
  instagramUrl: 'https://instagram.com/steinfbla',
  adviserEmail: 'allisoncuffaro@gmail.com',
  productionOrigin: 'https://steinbrennerfbla.com',
  hubPath: '/memberhub',
  logos: {
    crest: '/assets/logos/fbla-official-crest.png',
    crest512: '/assets/logos/fbla-crest-512.png',
    emblem: '/assets/logos/fbla-emblem.png',
    warriors: '/assets/logos/steinbrenner-warriors.png',
    warriorsSm: '/assets/logos/steinbrenner-warriors-sm.png',
  },
  links: {
    nationalFbla: 'https://www.fbla.org',
    floridaFbla: 'https://www.flfbla.org',
    nationalEvents: 'https://www.fbla.org/high-school/competitive-events/',
    floridaEvents: 'https://www.flfbla.org/competitive-event-guidelines',
    floridaRating: 'https://www.flfbla.org/competitive-event-rating-sheets',
    hillsboroughFbla: 'https://www.hillsboroughfbla.org',
    testFrenzy: 'https://www.testfrenzy.com/fbla/index.php',
    aoitJoin: 'https://aoit2020.squarespace.com/join-fbla',
  },
  marquee: ['Accounting', 'Marketing', 'Cyber Security', 'Business Plan', 'Public Speaking', 'Data Science & AI', 'Entrepreneurship', 'Website Design', 'Future Business Leader', 'Journalism', 'Mobile App Development', 'Financial Planning', 'Graphic Design', 'International Business', 'Coding & Programming'],
  stats: [
    { value: '230K+', label: 'Members Nationwide' },
    { value: '80+', label: 'Competitive Events' },
    { value: '3', label: 'Levels: District · State · National' },
    { value: '#1', label: 'Business Student Org in the US' },
  ],
} as const;

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/memberhub', label: 'Member Hub' },
  { to: '/contact', label: 'Contact' },
] as const;
