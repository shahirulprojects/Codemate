import { getUserAnswers } from "@/lib/actions/user.action";
import { SearchParamsProps } from "@/types";
import AnswerCard from "../cards/AnswerCard";
import Pagination from "./Pagination";

export interface Props extends SearchParamsProps {
  // we extends because searchProps is coming from searchParamProps
  userId: string;
  clerkId?: string | null;
}
const AnswersTab = async ({ searchParams, userId, clerkId }: Props) => {
  const result = await getUserAnswers({
    userId,
    page: searchParams.page ? +searchParams.page : 1,
  });
  const hasAnswers = result.answers.length > 0;

  return (
    <>
      {hasAnswers ? (
        <>
          {result.answers.map((item) => (
            <AnswerCard
              key={item._id}
              clerkId={clerkId}
              _id={item._id}
              question={item.question}
              author={item.author}
              upvotes={item.upvotes.length}
              createdAt={item.createdAt}
            />
          ))}

          <div className="my-10">
            <Pagination
              pageNumber={searchParams?.page ? +searchParams.page : 1} // we do +searchParams because thing from searchParams is usually in string so we want to convert it into a number
              isNext={result.isNextAnswer}
            />
          </div>
        </>
      ) : (
        <div className="ml-1 mt-[-8px] text-[18px] font-bold text-dark-300 dark:text-white">
          No Current Answers
        </div>
      )}
    </>
  );
};

export default AnswersTab;
