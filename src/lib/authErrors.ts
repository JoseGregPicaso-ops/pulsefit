// Firebase throws errors with a `.code` like "auth/email-already-in-use".
// This translates the common ones into messages a member will actually understand.
export function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/email-already-in-use":
      return "An account already exists with that email. Try logging in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// A stricter check than the browser's built-in email validation - requires
// a proper name@domain.tld shape, catching things like "name@gmailcom"
// (missing dot) before the form even submits.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
