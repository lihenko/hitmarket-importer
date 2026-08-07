export interface ProductConfig {

  hero?: {
    badgeText?: string;
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    checklist?: string[];
  };


  features?: {
    eyebrow?: string;
    title?: string;
    description?: string;

    items?: Array<{
      title: string;
      text: string;
      icon?: string;
      large?: boolean;
    }>;
  };


  sections?: Array<{
    type: "text" | "specifications" | "gallery";

    eyebrow?: string;
    title: string;
    description?: string;

    bullets?: string[];

    items?: Array<{
      name: string;
      value: string;
    }>;

    image?: string;
    imageAlt?: string;
  }>;


  package?: {
    eyebrow?: string;
    title?: string;
    description?: string;

    items?: string[];

    image?: string;
    imageAlt?: string;
  };


  faq?: Array<{
    question: string;
    answer: string;
  }>;


  reviews?: Array<{
    name: string;
    city?: string;
    rating: number;
    date?: string;
    text: string;
  }>;

}