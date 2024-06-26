import { getUserQuestions } from "@/lib/actions/user.action";
import { SearchParamsProps } from "@/types";
import React from "react";
import QuestionCard from "../cards/QuestionCard";
import Pagination from "./Pagination";

export interface Props extends SearchParamsProps {
  // we extends because searchProps is coming from searchParamProps
  userId: string;
  clerkId?: string | null;
}
const QuestionTab = async ({ searchParams, userId, clerkId }: Props) => {
  const result = await getUserQuestions({
    userId,
    page: searchParams.page ? +searchParams.page : 1,
  });
  const hasQuestions = result.questions.length > 0;

  return (
    <>
      {hasQuestions ? (
        <>
          {result.questions.map((question) => (
            <QuestionCard
              key={question._id}
              _id={question._id}
              clerkId={clerkId}
              title={question.title}
              tags={question.tags}
              author={question.author}
              upvotes={question.upvotes}
              views={question.views}
              answers={question.answers}
              createdAt={question.createdAt}
            />
          ))}
          <div className="my-10">
            <Pagination
              pageNumber={searchParams?.page ? +searchParams.page : 1}
              isNext={result.isNextQuestions}
            />
          </div>
        </>
      ) : (
        <div className="ml-1 text-[18px] font-bold text-dark-300 dark:text-white">
          No Current Questions
        </div>
      )}
    </>
  );
};

export default QuestionTab;
