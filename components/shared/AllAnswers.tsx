import Link from "next/link";
import Image from "next/image";

import Votes from "../shared/Votes";
import Filter from "../shared/Filter";
import ParseHTML from "../shared/ParseHTML";
import Pagination from "../shared/Pagination";

import { getTimeStamp } from "@/lib/utils";
import { AnswerFilters } from "@/constants/filters";
import { getAnswers } from "@/lib/actions/answer.action";

interface Props {
  questionId: string;
  userId: string;
  totalAnswers: number;
  page: string | undefined;
  filter: string | undefined;
}

const AllAnswers = async ({
  questionId,
  userId,
  totalAnswers,
  page,
  filter,
}: Props) => {
  const result = await getAnswers({
    questionId,
    page: page ? +page : 1,
    sortBy: filter,
  });

  return (
    <div className="mt-[50px]">
      <div className="flex items-center justify-between">
        <h3 className="base-semibold text-purple-950 dark:text-purple-200">
          {totalAnswers} Answers
        </h3>

        <Filter filters={AnswerFilters} />
      </div>

      <div>
        {result.answers.map((answer) => (
          <article
            key={answer._id}
            className=" text-dark300_light700 mt-7 w-full rounded-2xl bg-white px-7 py-10 dark:bg-black"
          >
            <span id={JSON.stringify(answer._id)} className="hash-span"></span>
            <div className="mb-8 flex flex-col-reverse justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
              <Link
                href={`/profile/${answer.author.clerkId}`}
                className="flex flex-1 items-start gap-1 sm:items-center"
              >
                <Image
                  src={answer.author.picture}
                  width={35}
                  height={35}
                  alt="profile"
                  className="mr-[2px] rounded-full object-cover max-sm:mt-0.5"
                />
                <div className="flex-col sm:flex-row sm:items-center">
                  <div className="flex items-center">
                    <p className="body-semibold text-dark300_light700">
                      {answer.author.name}
                    </p>
                  </div>
                  <p className="small-regular ml-0.5 mt-0.5 line-clamp-1  dark:text-slate-300">
                    {"  "}answered {getTimeStamp(answer.createdAt)}
                  </p>
                </div>
              </Link>
              <div className="flex justify-end">
                <Votes
                  type="Answer"
                  itemId={JSON.stringify(answer._id)}
                  userId={JSON.stringify(userId)}
                  upvotes={answer.upvotes.length}
                  hasupVoted={answer.upvotes.includes(userId)}
                  downvotes={answer.downvotes.length}
                  hasdownVoted={answer.downvotes.includes(userId)}
                />
              </div>
            </div>
            <ParseHTML data={answer.content} />
          </article>
        ))}
      </div>
      <div className="my-10 w-full">
        <Pagination
          pageNumber={page ? +page : 1}
          isNext={result.isNextAnswer}
        />
      </div>
    </div>
  );
};

export default AllAnswers;
