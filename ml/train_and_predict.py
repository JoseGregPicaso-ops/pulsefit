"""
PulseFit Churn Prediction
=========================
This script does three things:
  1. TRAIN: builds a churn-prediction model using realistic synthetic data
     (since PulseFit is brand new and has no real churn history yet - a
     common "cold start" situation in ML).
  2. EVALUATE: checks how well the model performs on data it hasn't seen.
  3. SCORE: pulls your REAL members from Firestore, computes the same
     features for them, and writes a churn-risk score back into Firestore
     so your Admin panel can display it.

Run this with: python train_and_predict.py
"""

import random
from datetime import datetime, timezone

import firebase_admin
import pandas as pd
from firebase_admin import credentials, firestore
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------------------------
# STEP 0: Connect to Firebase
# ---------------------------------------------------------------------------
# This uses a "service account" key - a different, more powerful credential
# than the public web API key. It lets this script read/write your database
# directly, bypassing the security rules (rules are for browser clients only).
# NEVER share this file or commit it anywhere public.
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


# ---------------------------------------------------------------------------
# STEP 1: Generate realistic synthetic training data
# ---------------------------------------------------------------------------
# Each row represents one (fictional) member's activity pattern, and whether
# they churned (cancelled) or not. The "rule of thumb" below reflects a
# realistic pattern: members who stop showing up and haven't engaged with
# features tend to cancel - with some random noise since real life isn't
# perfectly predictable.
def generate_training_data(n=800):
    rows = []
    for _ in range(n):
        weeks_as_member = random.randint(1, 52)
        avg_classes_per_week = round(random.uniform(0, 5), 2)
        days_since_last_booking = random.randint(0, 60)
        has_ai_plan = random.choice([0, 1])

        # The "true" pattern we're teaching the model to recognize
        risk_score = 0
        if days_since_last_booking > 21:
            risk_score += 0.5
        if avg_classes_per_week < 1:
            risk_score += 0.3
        if has_ai_plan == 0:
            risk_score += 0.1
        if weeks_as_member < 3:
            risk_score += 0.1

        # Add randomness so it's not a perfectly clean rule (real behavior isn't)
        churned = 1 if (risk_score + random.uniform(-0.2, 0.2)) > 0.5 else 0

        rows.append(
            {
                "weeks_as_member": weeks_as_member,
                "avg_classes_per_week": avg_classes_per_week,
                "days_since_last_booking": days_since_last_booking,
                "has_ai_plan": has_ai_plan,
                "churned": churned,
            }
        )
    return pd.DataFrame(rows)


print("Generating synthetic training data...")
data = generate_training_data()
print(f"Created {len(data)} training examples. {data['churned'].sum()} marked as churned.\n")

FEATURES = ["weeks_as_member", "avg_classes_per_week", "days_since_last_booking", "has_ai_plan"]
X = data[FEATURES]
y = data["churned"]

# ---------------------------------------------------------------------------
# STEP 2: Train the model
# ---------------------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# ---------------------------------------------------------------------------
# STEP 3: Evaluate the model
# ---------------------------------------------------------------------------
predictions = model.predict(X_test)
print("=== Model performance on held-out test data ===")
print(f"Accuracy: {accuracy_score(y_test, predictions):.2%}")
print(classification_report(y_test, predictions, target_names=["Stayed", "Churned"]))

print("=== Feature importance (what the model weighs most) ===")
for feature, importance in sorted(
    zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]
):
    print(f"  {feature}: {importance:.2%}")
print()

# ---------------------------------------------------------------------------
# STEP 4: Score your REAL members using the trained model
# ---------------------------------------------------------------------------
print("Fetching real members from Firestore...")
members = list(db.collection("members").stream())
now = datetime.now(timezone.utc)

scored_count = 0
for member_doc in members:
    member_id = member_doc.id
    member_data = member_doc.to_dict()

    # Skip admins/trainers - churn prediction is for regular members
    if member_data.get("role") != "member" and member_data.get("role") is not None:
        pass  # (members created before Phase 2 have no role field - treat as member)
    if member_data.get("role") == "admin":
        continue

    created_at_str = member_data.get("createdAt")
    if created_at_str:
        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        weeks_as_member = max(1, (now - created_at).days // 7)
    else:
        weeks_as_member = 1

    # Pull this member's bookings to compute real activity features
    bookings = list(db.collection("bookings").where("memberId", "==", member_id).stream())
    num_bookings = len(bookings)
    avg_classes_per_week = round(num_bookings / weeks_as_member, 2) if weeks_as_member else 0

    if bookings:
        booking_dates = [
            datetime.fromisoformat(b.to_dict()["bookedAt"].replace("Z", "+00:00"))
            for b in bookings
        ]
        days_since_last_booking = (now - max(booking_dates)).days
    else:
        days_since_last_booking = 999  # never booked anything

    plan_doc = db.collection("plans").document(member_id).get()
    has_ai_plan = 1 if plan_doc.exists else 0

    features = pd.DataFrame(
        [[weeks_as_member, avg_classes_per_week, days_since_last_booking, has_ai_plan]],
        columns=FEATURES,
    )

    risk_probability = model.predict_proba(features)[0][1]  # probability of "churned" class

    if risk_probability >= 0.66:
        risk_label = "High"
    elif risk_probability >= 0.33:
        risk_label = "Medium"
    else:
        risk_label = "Low"

    # Save the score to Firestore so the Admin panel can display it
    db.collection("churnScores").document(member_id).set(
        {
            "memberName": member_data.get("name", "Unknown"),
            "riskScore": round(float(risk_probability), 3),
            "riskLabel": risk_label,
            "weeksAsMember": weeks_as_member,
            "avgClassesPerWeek": avg_classes_per_week,
            "daysSinceLastBooking": days_since_last_booking,
            "computedAt": now.isoformat(),
        }
    )
    scored_count += 1
    print(f"  {member_data.get('name', member_id)}: {risk_label} risk ({risk_probability:.0%})")

print(f"\nDone. Scored {scored_count} members and saved results to Firestore.")
print("Check your Admin panel in the app to see the results.")
