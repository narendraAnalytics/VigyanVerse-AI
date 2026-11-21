// The policy text in the route's own server HTML (the book itself is drawn in the browser).
// Hidden on screen, where the book page shows the same text; it is there for readers without
// JavaScript and for automated checks (such as Razorpay's website review) that read raw HTML.
import { policyById, type PolicyId } from '@/lib/policies';
import { PolicyDocument } from './PolicyDocument';

export function PolicyPlainCopy({ id }: { id: PolicyId }) {
  return (
    <div hidden>
      <PolicyDocument doc={policyById(id)} />
    </div>
  );
}
