// This is PulseFit's "knowledge base" - the facts the AI coach is allowed to
// answer from. In a real gym, an admin would edit this (or it would come from
// a database) so the chatbot always reflects accurate, up-to-date info -
// instead of the AI just guessing or making things up.
//
// Each entry is a short, self-contained fact. Keeping them short and focused
// (rather than one giant wall of text) makes retrieval much more accurate.

export const knowledgeBase = [
  {
    id: "hours",
    text: "PulseFit is open Monday through Friday from 5:00 AM to 11:00 PM, and Saturday through Sunday from 7:00 AM to 9:00 PM. The gym floor closes 15 minutes before closing time for cleaning.",
  },
  {
    id: "membership-cancel",
    text: "Members can cancel their membership at any time from the Dashboard under Account Settings, or by emailing support. Cancellations take effect at the end of the current billing cycle - there are no cancellation fees.",
  },
  {
    id: "membership-freeze",
    text: "Members can freeze their membership for up to 3 months per year, for example due to travel or injury. Frozen months are not billed. Contact the front desk or use the Account Settings page to request a freeze.",
  },
  {
    id: "class-booking",
    text: "Classes can be booked up to 7 days in advance through the Classes page. If a class is full, there is currently no waitlist feature, but new classes are added regularly based on demand.",
  },
  {
    id: "class-cancel-policy",
    text: "Members should cancel a class booking at least 2 hours before the class start time if they can't attend, so the spot can open up for someone else. Repeated no-shows without cancelling may affect future booking priority.",
  },
  {
    id: "first-visit",
    text: "New members should arrive 15 minutes before their first class or gym session to complete a quick orientation. Bring workout clothes, a water bottle, and a towel. Lockers are available but members should bring their own lock.",
  },
  {
    id: "equipment-guest",
    text: "PulseFit provides all strength and cardio equipment, dumbbells up to 50kg, resistance bands, and yoga mats. Personal equipment is welcome but not required.",
  },
  {
    id: "guest-policy",
    text: "Members may bring one guest per month for free with a valid ID. Additional guest visits can be purchased at the front desk for a day-pass fee.",
  },
  {
    id: "personal-training",
    text: "One-on-one personal training sessions can be booked separately from group classes by contacting the front desk. Rates vary depending on the trainer and package size.",
  },
  {
    id: "safety-injury",
    text: "If a member feels pain, dizziness, or discomfort during a workout, they should stop immediately and notify a staff member. PulseFit trainers are certified in basic first aid, but members with pre-existing conditions should consult a doctor before starting a new program.",
  },
  {
    id: "attire",
    text: "Closed-toe athletic shoes are required on the gym floor for safety. Tank tops and shorts are fine; swimwear and jeans are not permitted during workouts.",
  },
  {
    id: "ai-plan-info",
    text: "The AI Workout Plan feature on the Dashboard generates a personalized weekly training and nutrition plan based on a member's goals, experience level, and available equipment. Members can regenerate their plan anytime as their goals change.",
  },
];
