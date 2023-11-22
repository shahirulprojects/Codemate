import { AnswerFilters } from "@/constants/filters";
import { getAnswers } from "@/lib/actions/answer.action";
import React from "react";
import Filter from "./Filter";
import Link from "next/link";
import Image from "next/image";
import { getTimeStamp } from "@/lib/utils";
import ParseHTML from "./ParseHTML";
import Votes from "./Votes";

interface Props {
  questionId: string;
  userId: string;
  totalAnswers: number;
  page?: number;
  filter?: number;
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
  });
  return (
    <div className="mt-11">
      <div className="flex items-center justify-between">
        <h3 className="base-semibold text-purple-950 dark:text-purple-200">
          {totalAnswers !== 1
            ? `${totalAnswers} Answers`
            : `${totalAnswers} Answer`}{" "}
        </h3>

        <Filter filters={AnswerFilters} />
      </div>
      <div>
        {result.answers.map(
          (
            answer // mapping all of the answers and each answer will have its own article
          ) => (
            <article
              key={answer._id}
              className="light-border text-dark300_light700 mt-7 w-full rounded-2xl border-b bg-white px-7 py-10 dark:bg-black"
            >
              <div className="flex items-center justify-between">
                <div className="mb-8 flex flex-col-reverse justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
                  {/* showing the author of the answer */}
                  <Link
                    href={`/profile/${answer.author.clerkId}`}
                    className="flex flex-1 items-start gap-1 sm:items-center"
                  >
                    <Image
                      src={answer.author.picture}
                      width={18}
                      height={18}
                      alt="profile"
                      className="rounded-full object-cover max-sm:mt-0.5"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <p className="body-semibold text-dark300_light700">
                        {answer.author.name}
                      </p>

                      <p className="small-regular ml-0.5 mt-0.5 line-clamp-1  dark:text-slate-300">
                        {"  "} - answered {getTimeStamp(answer.createdAt)}
                      </p>
                    </div>
                  </Link>
                  <div className="flex justify-end">
                    <Votes
                      type="Answer" // to check the type whether it is question or answer
                      itemId={JSON.stringify(answer._id)}
                      userId={JSON.stringify(userId)}
                      upvotes={answer.upvotes.length} // to display the number of upvotes
                      hasupVoted={answer.upvotes.includes(userId)} // to check if the current question includes the user id.If it does, it means that the user already upvoted
                      downvotes={answer.downvotes.length}
                      hasdownVoted={answer.downvotes.includes(userId)}
                    />
                  </div>
                </div>
              </div>
              <ParseHTML data={answer.content} />
            </article>
          )
        )}
      </div>
    </div>
  );
};

export default AllAnswers;