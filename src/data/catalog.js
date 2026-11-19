
const expertData = [
  { name: "Pandit Deepak Sharma", level: "Senior", rating: 4.8, experience: 2 },
  { name: "Madhuri Charan", level: "Senior", rating: 4.6, experience: 6 },
  { name: "Ram Raheem Sharma", level: "Senior", rating: 4.7, experience: 4 },
  { name: "Nita Kulkarni", level: "Senior", rating: 4.5, experience: 2 },
  { name: "Naina Sharma", level: "Senior", rating: 4.9, experience: 3 },
  { name: "Mahira Desai", level: "Senior", rating: 4.4, experience: 7 },
  { name: "Mohan Lal", level: "Other", rating: 4.2, experience: 3 },
  { name: "Sh. Rameshwar Datt Sharma", level: "Senior", rating: 4.8, experience: 14 },
  { name: "Sh. Mast Ram", level: "Senior", rating: 4.6, experience: 18 },
  { name: "Sh. Bhajna Nand", level: "Other", rating: 4.1, experience: 6 },
  { name: "Sh. Ganesh Dutt", level: "Senior", rating: 4.7, experience: 21 },
  { name: "Sh. Vidya Sagar Sharma", level: "Other", rating: 4.3, experience: 7 },
  { name: "Sh. T. Narayanan Namboodri", level: "Senior", rating: 4.9, experience: 5 },
  { name: "Shri M. Raghavan Achari", level: "Senior", rating: 4.5, experience: 2 },
  { name: "Smt. A.K. Vaisalakshy", level: "Other", rating: 4.4, experience: 3 },
  { name: "Sh. K.V. Pokkan Panicker", level: "Other", rating: 4.2, experience: 4 },
  { name: "Smt. T.R. Meenakshi", level: "Other", rating: 4.6, experience: 2 },
  { name: "Smt. R. Mangalam", level: "Other", rating: 4.3, experience: 2 },
  { name: "Smt. N. Meenakshi Ammal", level: "Other", rating: 4.7, experience: 6 },
  { name: "Smt. K.S. Rugmani Ammal", level: "Other", rating: 4.1, experience: 8 },
  { name: "Smt. K.R. Thangammal", level: "Other", rating: 4.5, experience: 3 },
  { name: "Sh. K.R. Thiruvenkatanatha Sarma", level: "Other", rating: 4.8, experience: 4 },
  { name: "Smt. N.S. Muthu Lakshmi", level: "Other", rating: 4.4, experience: 1 },
  { name: "Sh. Pappukuttan Ali’s Appukuttan Panicker", level: "Other", rating: 4.2, experience: 7 },
  { name: "Sh. K.M. Parameswaran Namboodri", level: "Senior", rating: 4.9, experience: 5 },
  { name: "Sh. Haridathan Namboothiri", level: "Senior", rating: 4.6, experience: 9 },
  { name: "Sh. A.K. Vasu", level: "Other", rating: 4.3, experience: 3 },
  { name: "Smt. P.V. Narayani Ammal", level: "Other", rating: 4.7, experience: 4 },
  { name: "Smt. A. Sreedevi Antharjanam", level: "Senior", rating: 4.8, experience: 8 },
];

export const experts = expertData.map((expert, index) => ({
  ...expert,
  photo: `/experts/expert-${index + 1}.jpg`,
}));

export const services = [
  { name: "Basic Kundli", senior: 49, other: 39 },
  { name: "Daily Horoscope", senior: 0, other: 0 },
  { name: "Kundli Matching", senior: 99, other: 79 },
  { name: "Chat – 5 Minutes", senior: 25, other: 20 },
  { name: "Chat – 30 Minutes", senior: 99, other: 79 },
  { name: "Detailed Kundli", senior: 199, other: 149 },
  { name: "Personal Consultation – 30 Minutes", senior: 199, other: 149 },
];

export const getPrice = (expert, service) =>
  !expert || !service
    ? 0
    : expert.level === "Senior"
      ? service.senior
      : service.other;
