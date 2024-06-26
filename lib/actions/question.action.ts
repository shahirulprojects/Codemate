"use server";

import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import { connectToDatabase } from "../mongoose";
import {
  CreateQuestionParams,
  DeleteQuestionParams,
  EditQuestionParams,
  GetQuestionByIdParams,
  GetQuestionsParams,
  QuestionVoteParams,
  RecommendedParams,
} from "./shared.types";
import User from "@/database/user.model";
import { revalidatePath } from "next/cache";
import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";
import { FilterQuery } from "mongoose";

export async function getQuestions(params: GetQuestionsParams) {
  try {
    connectToDatabase();

    const { searchQuery, filter, page = 1, pageSize = 3 } = params; // searchQuesry is from (home)>page.tsx

    // calculate the number of posts to skip based on the page number and page size
    const skipAmount = (page - 1) * pageSize; // for example if we are at page 2, it will be 2-1 and then times 20 meaning that we want to skip the first twenty and only see the rest of it

    const query: FilterQuery<typeof Question> = {}; // how to read: query of a type FilterQuery and we are filtering something that are a type of Question. {} means that our query at the start is just an empty object

    // if a search query is provided, filter questions by title or content
    if (searchQuery) {
      query.$or = [
        { title: { $regex: new RegExp(searchQuery, "i") } },
        { content: { $regex: new RegExp(searchQuery, "i") } }, // if the content contains the keyword of the search we will also display it
      ];
    }

    let sortOptions = {};

    switch (filter) {
      case "newest":
        sortOptions = { createdAt: -1 }; // sort by the latest questions asked
        break;
      case "frequent":
        sortOptions = { views: -1 }; // sort by the highest question view since user frequently see that question
        break;
      case "unanswered":
        query.answers = { $size: 0 }; // sort by questions that has 0 answers
        break;

      default:
        break;
    }
    const questions = await Question.find(query) // to find question
      .populate({ path: "tags", model: Tag }) // if a specific question has tags attached to it,we want to populate all the values from the tags so that we can also display them at the question card.We do this because MongoDB does not show the name for the tag,it only show the reference.So to be able to get the name,we have to populate it
      .populate({ path: "author", model: User })
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions); // to sort from newest question to oldest question (the newer question will be at the top)

    // figuring out if the next page exist or not

    const totalQuestions = await Question.countDocuments(query);

    const isNext = totalQuestions > skipAmount + questions.length;
    // skipAmount is the number of questions we already skipped / seen
    // questions.length represents the number of questions of the current page we are at
    // for example if we have 101 total questions and the skipped amount is currently 4 pages with the pageSize value of 5 and the current page that we are at contains 5 questions
    // so the total would be 25, meaning that 101>25 therefore we will still have next pages
    return { questions, isNext };
  } catch (error) {
    console.error("Error fetching questions:", error);
    throw error;
  }
}

// we are dealing with asynchronous code so that's why we will have the try and catch block to handle if the call succeed or not
export async function createQuestion(params: CreateQuestionParams) {
  try {
    connectToDatabase();

    const { title, content, tags, author, path } = params;
    // destructuring the params
    // accepting parameters from the front end (everything we pass from our form).The path is going to be an URL to the page that we have to reload (the homepage) because we have to revalidate it so that next.js know something has change

    // create the question
    const question = await Question.create({
      title,
      content,
      author,
    });

    const tagDocuments = [];

    // create the tags or get them if they already exist
    // findOneAndUpdate is a special mongoose property that has 2 parameters.We can add additional parameters if we want but essentially it has to be at least 2
    // it finds a document in the Tag collection that matches the specified conditions and updates it. If no document is found, it creates a new one
    // basically if the question created has a tag which already exist in the array it will add the question id to the tag and if not,it will create a new tag
    for (const tag of tags) {
      // looping over the tags array
      const existingTag = await Tag.findOneAndUpdate(
        // allows us find something (findOne)
        {
          name: { $regex: new RegExp(`^${tag}$`, "i") }, // looks for a tag whose name matches the tag variable (case-insensitive)."regex" stands for regular expression and the "i" stands for case-insensitive
        },
        // allows us to do something on it (Update)
        {
          $setOnInsert: { name: tag }, // if a document is being inserted (i.e., no matching document is found), this operation sets the name field to the current "tag"
          $push: { questions: question._id }, // regardless of whether a document is found or inserted, it pushes the ID of a question (question._id) into the question array field of the document
        },
        // additional parameter
        {
          upsert: true, // if no document is found, create a new one based on the query criteria and update operations
          new: true, // return the modified document rather than the original one
        }
      );

      tagDocuments.push(existingTag._id); // after each operation, it pushes the _id of the tag (whether existing or newly created) into the tagDocuments array
    }

    await Question.findByIdAndUpdate(question._id, {
      $push: { tags: { $each: tagDocuments } },
      // after processing all tags, it updates the Question document with the ID question._id.
      // it pushes each element of the tagDocuments array into the tags array of the Question document.
      // the $each modifier is used to add multiple values to the array
      // after processing all tags, it updates the Question document by pushing all collected tag IDs into its tags array.
    });

    // create an interaction record for the user's ask_question action (to track who is the author of the question)
    await Interaction.create({
      user: author,
      action: "ask_question",
      question: question._id,
      tags: tagDocuments,
    });

    // increment author's reputation by +5 for creating a question
    await User.findByIdAndUpdate(author, { $inc: { reputation: 5 } }); // pass in the authpr and update their reputation by 5 points

    revalidatePath(path); // to remove the need to reload the homepage everytime a new question is added
  } catch (error) {
    console.error("Error creating question:", error);
    throw error;
  }
}

export async function getQuestionById(params: GetQuestionByIdParams) {
  try {
    connectToDatabase();

    const { questionId } = params;

    const question = await Question.findById(questionId)
      .populate({
        path: "tags",
        model: Tag,
        select: "_id name",
      }) // selecting the id and the name
      .populate({
        path: "author",
        model: User,
        select: "id_ clerkId name picture",
      }); // selecting only the id,clerkId,name,picture

    return question;
  } catch (error) {
    console.error("Error fetching question by ID:", error);
    throw error;
  }
}

export async function upvoteQuestion(params: QuestionVoteParams) {
  try {
    await connectToDatabase();

    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if (hasupVoted) {
      updateQuery = { $pull: { upvotes: userId } }; // pull the specific userId  from the upvotes . Pull means that we dont want to do the action or we want to undo it
      // we dont want to upvote again since we already upvoted
    } else if (hasdownVoted) {
      updateQuery = {
        $pull: { downvotes: userId }, // pull the specific userId  from the downvotes
        $addToSet: { upvotes: userId }, // push  the specific userId to the upvotes
        // we undo the downvote and then we upvoted
      };
    } else {
      updateQuery = { $addToSet: { upvotes: userId } }; // if we have not already upvoted or downvoted we will add a new upvote of the userId to the set
    }

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    }); // passed in the questionId and the updateQuery and create a new instance

    if (!question) {
      throw new Error("Question not found");
    }

    // increment author's reputation by +1 for upvoting a question and -1 for undoing the upvote
    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasupVoted ? -1 : +1 },
    });

    // increment author's reputation by +10 for receiving an upvote to the question they created or -10 for receiving a downvote for the question they created
    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasupVoted ? -10 : +10 },
    });

    revalidatePath(path);
  } catch (error) {
    console.error("Error upvoting question:", error);
    throw error;
  }
}

export async function downvoteQuestion(params: QuestionVoteParams) {
  try {
    await connectToDatabase();

    const { questionId, userId, hasupVoted, hasdownVoted, path } = params;

    let updateQuery = {};

    if (hasdownVoted) {
      updateQuery = { $pull: { downvotes: userId } }; // pull the specific userId  from the downvotes . Pull means that we dont want to do the action or we want to undo it
      // we dont want to downvote again since we already downvoted
    } else if (hasupVoted) {
      updateQuery = {
        $pull: { upvotes: userId }, // pull the specific userId  from the upvotes
        $addToSet: { downvotes: userId }, // push  the specific userId to the downvotes
        // we undo the upvote and then we downvoted
      };
    } else {
      updateQuery = { $addToSet: { downvotes: userId } }; // if we have not already upvoted or downvoted we will add a new downvote of the userId to the set
    }

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    }); // passed in the questionId and the updateQuery and create a new instance

    if (!question) {
      throw new Error("Question not found");
    }

    // increment author's reputation
    // downvoting or undoing the downvote for other people's answer
    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasdownVoted ? +1 : -1 },
    });

    // receiving downvote from other users
    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasdownVoted ? +10 : -10 },
    });

    revalidatePath(path);
  } catch (error) {
    console.error("Error downvoting question:", error);
    throw error;
  }
}

export async function deleteQuestion(params: DeleteQuestionParams) {
  try {
    await connectToDatabase();

    const { questionId, path } = params;

    await Question.deleteOne({ _id: questionId }); // delete the question
    await Answer.deleteMany({ question: questionId }); // delete all answers associated with the question
    await Interaction.deleteMany({ question: questionId }); // delete all interaction associated with the question
    await Tag.updateMany(
      { questions: questionId },
      { $pull: { questions: questionId } }
    ); // remove the reference to this question from all of the tags

    revalidatePath(path);
  } catch (error) {
    console.error("Error deleting question:", error);
    throw error;
  }
}

export async function editQuestion(params: EditQuestionParams) {
  try {
    await connectToDatabase();

    const { questionId, title, content, tags, path } = params;

    const question = await Question.findById(questionId).populate("tags"); // find the question that has to be updated

    if (!question) {
      throw new Error("Question not found");
    }

    // update question fields
    question.title = title; // update the title
    question.content = content; // update the content

    await question.save();

    const newTags = tags.map((tag: string) => tag.toUpperCase());
    const existingTags = question.tags.map((tag: any) =>
      tag.name.toUpperCase()
    );

    const tagUpdates = {
      tagsToAdd: [] as string[],
      tagsToRemove: [] as string[],
    };

    for (const tag of newTags) {
      if (!existingTags.includes(tag.toUpperCase())) {
        tagUpdates.tagsToAdd.push(tag);
      }
    }

    for (const tag of question.tags) {
      if (!newTags.includes(tag.name.toUpperCase())) {
        tagUpdates.tagsToRemove.push(tag._id);
      }
    }

    // add new tags and link them to the question
    const newTagDocuments = [];

    for (const tag of tagUpdates.tagsToAdd) {
      const newTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tag}$`, "i") } },
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        { upsert: true, new: true }
      );

      newTagDocuments.push(newTag._id);
    }

    console.log({ tagUpdates });

    // remove question reference for tagsToRemove from the tag
    if (tagUpdates.tagsToRemove.length > 0) {
      await Tag.updateMany(
        { _id: { $in: tagUpdates.tagsToRemove } },
        { $pull: { questions: question._id } }
      );
    }

    if (tagUpdates.tagsToRemove.length > 0) {
      await Question.findByIdAndUpdate(question._id, {
        $pull: { tags: { $in: tagUpdates.tagsToRemove } },
      });
    }

    if (newTagDocuments.length > 0) {
      await Question.findByIdAndUpdate(question._id, {
        $push: { tags: { $each: newTagDocuments } },
      });
    }

    revalidatePath(path);
  } catch (error) {
    console.error("Error editing question:", error);
    throw error;
  }
}

export async function getHotQuestions() {
  // this function does not need a param since our question already has views and upvotes which we can make use of
  try {
    await connectToDatabase();

    const hotQuestions = await Question.find({}) // once it connect to the database we will find question and sort it according to views and upvotes
      .sort({ views: -1, upvotes: -1 }) // will sort in a descending order meaning that the hottest questions will be at the top
      .limit(5); // will only show top 5 hot questions

    return hotQuestions;
  } catch (error) {
    console.error("Error fetching hot questions:", error);
    throw error;
  }
}

export async function getRecommendedQuestions(params: RecommendedParams) {
  try {
    await connectToDatabase();

    const { userId, page = 1, pageSize = 20, searchQuery } = params;

    // find user
    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      throw new Error("user not found");
    }

    const skipAmount = (page - 1) * pageSize;

    // find the user's interactions to see what tags they have been following
    const userInteractions = await Interaction.find({ user: user._id })
      .populate("tags")
      .exec();

    // extract tags from user's interactions
    const userTags = userInteractions.reduce((tags, interaction) => {
      if (interaction.tags) {
        tags = tags.concat(interaction.tags);
      }
      return tags;
    }, []);

    // get distinct tag IDs from user's interactions
    const distinctUserTagIds = [
      // @ts-ignore
      ...new Set(userTags.map((tag: any) => tag._id)),
    ];

    const query: FilterQuery<typeof Question> = {
      $and: [
        { tags: { $in: distinctUserTagIds } }, // questions with user's tags
        { author: { $ne: user._id } }, // exclude user's own questions so that user wont see their own questions at the recommendation
      ],
    };

    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const totalQuestions = await Question.countDocuments(query);

    const recommendedQuestions = await Question.find(query)
      .populate({
        path: "tags",
        model: Tag,
      })
      .populate({
        path: "author",
        model: User,
      })
      .skip(skipAmount)
      .limit(pageSize);

    const isNext = totalQuestions > skipAmount + recommendedQuestions.length;

    return { questions: recommendedQuestions, isNext };
  } catch (error) {
    console.error("Error getting recommended questions:", error);
    throw error;
  }
}
