/* eslint-disable no-unused-vars */
import Question from "@/components/forms/Question";
import { getUserById } from "@/lib/actions/user.action";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import React from "react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask a Question | Codemate",
};

const Page = async () => {
  const { userId } = auth(); // get the current userId from clerk

  if (!userId) redirect("/sign-in"); // if we dont currently have a userId,it will redirect to the sign in page

  const mongoUser = await getUserById({ userId }); // call the user server action and pass the userId

  return (
    <div>
      <h1 className="h1-bold text-dark100_light900">Ask a Question</h1>

      <div className="mt-9">
        {/* pass the mongoUser to the Question form.It is always a good thing to use JSON.stringify things that we get because we dont know what they are */}
        <Question mongoUserId={JSON.stringify(mongoUser?._id)} />
      </div>
    </div>
  );
};

export default Page;
