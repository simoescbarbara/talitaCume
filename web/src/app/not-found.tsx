import Link from "next/link";
import { copy } from "@/lib/copy";

export default function NotFound() {
  return (
    <div className="wrap page">
      <h1 className="page-title">{copy.notFound.title}</h1>
      <p className="status">{copy.notFound.body}</p>
      <p className="profile__actions">
        <Link className="button" href="/">
          {copy.notFound.action}
        </Link>
      </p>
    </div>
  );
}
