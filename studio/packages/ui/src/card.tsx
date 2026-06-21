import { forwardRef } from "react";
import { cn } from "./cn";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

const Root = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn("mwui-card", className)} {...rest} />
  ),
);
Root.displayName = "Card";

const Header = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn("mwui-card__header", className)} {...rest} />
  ),
);
Header.displayName = "Card.Header";

const Body = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn("mwui-card__body", className)} {...rest} />
  ),
);
Body.displayName = "Card.Body";

const Footer = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={cn("mwui-card__footer", className)} {...rest} />
  ),
);
Footer.displayName = "Card.Footer";

/** Compound Card: `<Card><Card.Header/><Card.Body/><Card.Footer/></Card>`. */
export const Card = Object.assign(Root, { Header, Body, Footer });
