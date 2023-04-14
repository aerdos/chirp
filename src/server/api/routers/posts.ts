import type { User } from "@clerk/backend/dist/types/api";
import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const filterUserForClient = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    profilePicture: user.profileImageUrl,
  };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
    });

    const users = (
      await clerkClient.users.getUserList({
        userId: posts.map((post) => post.authorId),
        limit: 100,
      })
    ).map(filterUserForClient);

    console.log(`postsRouter: \n${users}`);

    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId);

      if (!author || !author.username)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Author for post not found",
        });

      console.log(author.username);

      return {
        post,
        author: {
          ...author,
          username: author.username,
        }, // this very well could be unnecessary, trying to fix a TS typing warning/error
      };
    });
  }),
});
