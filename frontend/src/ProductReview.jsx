import { useState, useEffect } from "react";
import { api } from "./api";

export default function ProductReview({
  productId,
  productName = "This Product",
  canReview = false,
  onReviewAdded,
}) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [thankYouMessage, setThankYouMessage] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isDemo = String(productId).startsWith("demo-");

  const load = () => {
    if (isDemo) return setReviews([]);
    api(`/products/${productId}/reviews`)
      .then((d) => setReviews(d.reviews))
      .catch(() => setReviews([]));
  };

  useEffect(load, [productId]);

  const handleSubmit = async () => {
    if (!rating && !comment.trim()) return;
    if (isDemo) return setError("Demo products can't be reviewed. Use a real product.");
    setBusy(true);
    setError("");
    try {
      const d = await api(`/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      setReviews(d.reviews);
      setRating(0);
      setComment("");
      setShowForm(false);
      setThankYouMessage(true);
      onReviewAdded?.(d.product);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const rated = reviews.filter((r) => r.rating > 0);
  const averageRating = rated.length
    ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1)
    : null;

  return (
    <div className="review-box">
      <h3>Reviews and ratings</h3>

      {averageRating && (
        <p className="review-avg">
          ★ {averageRating}{" "}
          <span>({rated.length} rating{rated.length > 1 ? "s" : ""})</span>
        </p>
      )}

      {canReview && showForm && (
        <div className="review-form">
          <p>How was {productName}? <em>(optional)</em></p>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={star <= (hover || rating) ? "star on" : "star"}
                onClick={() => setRating(star === rating ? 0 : star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${star} star`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder="Write your review here..."
            value={comment}
            maxLength={500}
            onChange={(e) => setComment(e.target.value)}
          ></textarea>
          {error && <p className="form-error">{error}</p>}
          <div className="review-actions">
            <button type="button" onClick={handleSubmit} disabled={busy}>
              {busy ? "Saving…" : "Submit"}
            </button>
            <button type="button" className="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {thankYouMessage && <p className="review-thanks">Thank you for your review!</p>}

      {reviews.length === 0 ? (
        <p className="review-empty">No reviews yet.</p>
      ) : (
        <ul className="review-list">
          {reviews.map((r, i) => (
            <li key={r._id || i}>
              <strong>{r.userName}</strong>
              {r.rating > 0 && (
                <span className="review-stars">
                  {" "}{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </span>
              )}
              <small> · {new Date(r.createdAt).toLocaleDateString()}</small>
              {r.comment && <p>{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}