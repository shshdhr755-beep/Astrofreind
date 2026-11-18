export const experts = [
  { name: "Pandit Deepak Sharma", level: "Senior" },
  { name: "Madhuri Charan", level: "Senior" },
  { name: "Ram Raheem Sharma", level: "Senior" },
  { name: "Nita Kulkarni", level: "Senior" },
  { name: "Naina Sharma", level: "Senior" },
  { name: "Mahira Desai", level: "Senior" },
  { name: "Mohan Lal", level: "Other" },
  { name: "Sh. Rameshwar Datt Sharma", level: "Senior" },
  { name: "Sh. Mast Ram", level: "Senior" },
  { name: "Sh. Bhajna Nand", level: "Other" },
  { name: "Sh. Ganesh Dutt", level: "Senior" },
  { name: "Sh. Vidya Sagar Sharma", level: "Other" },
  { name: "Sh. T. Narayanan Namboodri", level: "Senior" },
  { name: "Shri M. Raghavan Achari", level: "Senior" },
  { name: "Smt. A.K. Vaisalakshy", level: "Other" },
  { name: "Sh. K.V. Pokkan Panicker", level: "Other" },
  { name: "Smt. T.R. Meenakshi", level: "Other" },
  { name: "Smt. R. Mangalam", level: "Other" },
  { name: "Smt. N. Meenakshi Ammal", level: "Other" },
  { name: "Smt. K.S. Rugmani Ammal", level: "Other" },
  { name: "Smt. K.R. Thangammal", level: "Other" },
  { name: "Sh. K.R. Thiruvenkatanatha Sarma", level: "Other" },
  { name: "Smt. N.S. Muthu Lakshmi", level: "Other" },
  { name: "Sh. Pappukuttan Ali’s Appukuttan Panicker", level: "Other" },
  { name: "Sh. K.M. Parameswaran Namboodri", level: "Senior" },
  { name: "Sh. Haridathan Namboothiri", level: "Senior" },
  { name: "Sh. A.K. Vasu", level: "Other" },
  { name: "Smt. P.V. Narayani Ammal", level: "Other" },
  { name: "Smt. A. Sreedevi Antharjanam", level: "Senior" },
];

export const services = [
  { name: "Basic Kundli", senior: 49, other: 39 },
  { name: "Daily Horoscope", senior: 0, other: 0 },
  { name: "Kundli Matching", senior: 99, other: 79 },
  { name: "Chat – 5 Minutes", senior: 25, other: 20 },
  { name: "Chat – 30 Minutes", senior: 99, other: 79 },
  { name: "Detailed Kundli", senior: 199, other: 149 },
  { name: "Personal Consultation – 30 Minutes", senior: 199, other: 149 },
];


export const getPrice = (expert, service) => !expert || !service ? 0 : expert.level === "Senior" ? service.senior : service.other;
