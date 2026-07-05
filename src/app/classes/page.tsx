"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  runTransaction,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

type GymClass = {
  id: string;
  title: string;
  trainer: string;
  day: string;
  time: string;
  capacity: number;
  bookedCount: number;
};

type Booking = {
  id: string; // same as the booking document id
  classId: string;
};

export default function Classes() {
  const { user, member, loading } = useAuth();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [busyClassId, setBusyClassId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Live-listen to the classes collection, so the list updates instantly
  // (e.g. if an admin adds a class while you're on this page)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "classes"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<GymClass, "id">),
      }));
      setClasses(list);
    });
    return () => unsubscribe();
  }, []);

  // Live-listen to MY bookings only, so I can see which classes I've already booked
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("memberId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMyBookings(
        snap.docs.map((d) => ({ id: d.id, classId: d.data().classId }))
      );
    });
    return () => unsubscribe();
  }, [user]);

  const isBooked = (classId: string) =>
    myBookings.some((b) => b.classId === classId);

  const bookingFor = (classId: string) =>
    myBookings.find((b) => b.classId === classId);

  // Booking a class safely: a "transaction" makes sure two people can't both
  // grab the last spot at the same time (it re-checks capacity right before saving)
  const handleBook = async (gymClass: GymClass) => {
    if (!user || !member) return;
    setBusyClassId(gymClass.id);
    setMessage("");
    try {
      await runTransaction(db, async (transaction) => {
        const classRef = doc(db, "classes", gymClass.id);
        const classSnap = await transaction.get(classRef);
        const current = classSnap.data() as GymClass;

        if (current.bookedCount >= current.capacity) {
          throw new Error("This class just filled up.");
        }

        // Create the booking record
        const bookingRef = doc(collection(db, "bookings"));
        transaction.set(bookingRef, {
          memberId: user.uid,
          memberName: member.name,
          classId: gymClass.id,
          className: gymClass.title,
          day: gymClass.day,
          time: gymClass.time,
          bookedAt: new Date().toISOString(),
        });

        // Increment the class's booked count
        transaction.update(classRef, { bookedCount: current.bookedCount + 1 });
      });
    } catch (err: any) {
      setMessage(err.message || "Couldn't book this class.");
    } finally {
      setBusyClassId(null);
    }
  };

  const handleCancel = async (gymClass: GymClass) => {
    const booking = bookingFor(gymClass.id);
    if (!booking) return;
    setBusyClassId(gymClass.id);
    try {
      await runTransaction(db, async (transaction) => {
        const classRef = doc(db, "classes", gymClass.id);
        const classSnap = await transaction.get(classRef);
        const current = classSnap.data() as GymClass;
        const bookingRef = doc(db, "bookings", booking.id);

        transaction.delete(bookingRef);
        transaction.update(classRef, {
          bookedCount: Math.max(0, current.bookedCount - 1),
        });
      });
    } finally {
      setBusyClassId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-steel">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar member={member} />

      <div className="px-6 py-8 md:px-12">
        <p className="font-mono text-signal text-sm mb-2 tracking-widest">
          002 · BOOK YOUR SPOT
        </p>
        <h1 className="font-display text-5xl text-chalk mb-8">CLASSES</h1>

        {message && (
          <p className="font-body text-signal text-sm mb-4">{message}</p>
        )}

        {classes.length === 0 ? (
          <p className="font-body text-steel">
            No classes scheduled yet. Check back soon.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => {
              const full = c.bookedCount >= c.capacity;
              const booked = isBooked(c.id);
              const spotsLeft = Math.max(0, c.capacity - c.bookedCount);

              return (
                <div
                  key={c.id}
                  className="border border-steel/30 rounded-lg p-6 flex flex-col justify-between"
                >
                  <div>
                    <p className="font-mono text-steel text-xs tracking-widest mb-1">
                      {c.day.toUpperCase()} · {c.time}
                    </p>
                    <h2 className="font-display text-2xl text-chalk mb-1">
                      {c.title}
                    </h2>
                    <p className="font-body text-steel text-sm mb-4">
                      with {c.trainer}
                    </p>
                    <p className="font-mono text-amber text-sm mb-4">
                      {full ? "FULL" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                    </p>
                  </div>

                  {booked ? (
                    <button
                      onClick={() => handleCancel(c)}
                      disabled={busyClassId === c.id}
                      className="border border-signal text-signal py-2 rounded font-body text-sm hover:bg-signal/10 transition-colors disabled:opacity-50"
                    >
                      {busyClassId === c.id ? "Cancelling..." : "Cancel booking"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBook(c)}
                      disabled={full || busyClassId === c.id}
                      className="bg-signal text-chalk py-2 rounded font-body text-sm hover:bg-signal/90 transition-colors disabled:opacity-40"
                    >
                      {busyClassId === c.id
                        ? "Booking..."
                        : full
                        ? "Full"
                        : "Book class"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
