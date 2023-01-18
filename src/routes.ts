import dayjs from "dayjs";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "./lib/prisma";

export async function appRoutes(app: FastifyInstance) {
  app.post("/habits", async (request) => {
    const createHabitBody = z.object({
      title: z.string(), //required
      weekDays: z.array(z.number().min(0).max(6)),
    });

    const { title, weekDays } = createHabitBody.parse(request.body);

    const today = dayjs().startOf("day").toDate();

    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            };
          }),
        },
      },
    });
  });

  app.get("/day", async (request) => {
    try {
      const getDayParams = z.object({
        date: z.coerce.date(),
      });

      const { date } = getDayParams.parse(request.query);

      const parsedDay = dayjs(date).startOf("day");
      const weekDay = dayjs(date).get("day");

      const possibleHabits = await prisma.habit.findMany({
        where: {
          created_at: {
            lte: date,
          },
          weekDays: {
            some: {
              week_day: weekDay,
            },
          },
        },
      });

      const day = await prisma.day.findUnique({
        where: {
          date: parsedDay.toDate(),
        },
        include: {
          dayHabits: true,
        },
      });

      const completedHabits = day?.dayHabits.map(
        (dayHabits) => dayHabits.habit_id
      );

      return {
        possibleHabits,
        completedHabits,
      };
    } catch (error) {
      console.log(error);
    }
  });
}

// advantages zod: typeScript automatically and validation
