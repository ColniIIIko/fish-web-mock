import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import multer from 'multer';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);
const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME!;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const adminAuth: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const adminToken = req.headers['x-admin-api-key'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    res.status(403).json({ error: 'Unauthorized access' });
    return;
  }
  next();
};

const uploadFileToSupabase = async (
  file: Express.Multer.File
): Promise<string | null> => {
  try {
    const fileName = `${Date.now()}-${file.originalname}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    // Generate public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('File upload failed:', err);
    return null;
  }
};

app.post(
  '/createTrip',
  upload.fields([
    { name: 'pictures', maxCount: 10 },
    { name: 'fishCaughtPictures', maxCount: 50 }, // For fishCaught pictures
  ]),
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const {
        nickname,
        city,
        tripDate,
        boat,
        landing,
        type,
        setup,
        report,
        userEmail,
        fishCaught,
        conditions,
        anglers,
      } = req.body;

      //@ts-ignore
      const pictures = (req.files?.['pictures'] ?? []) as Express.Multer.File[];
      const uploadedPictures = await Promise.all(
        pictures.map(async (file) => await uploadFileToSupabase(file))
      );

      //@ts-ignore
      let fishPictures = req.files?.[
        'fishCaughtPictures'
      ] as Express.Multer.File[];

      console.log(fishPictures);

      let fishCaughtData = JSON.parse(fishCaught || '[]');

      if (!Array.isArray(fishCaughtData)) {
        fishCaughtData = [fishCaughtData];
      }

      let processedFishCaught;
      if (fishPictures) {
        processedFishCaught = await Promise.all(
          fishCaughtData.map(async (fish: any) => {
            const { picturesCount, ...restFish } = fish;

            console.log(fish);
            if (picturesCount && picturesCount > 0) {
              const fishPicture = fishPictures.slice(0, picturesCount);
              fishPictures = fishPictures.slice(picturesCount);

              const uploadedFishPictures = await Promise.all(
                fishPicture.map(
                  async (file) => await uploadFileToSupabase(file)
                )
              );
              return {
                ...restFish,
                attachments: uploadedFishPictures.filter(Boolean),
              };
            } else {
              return restFish;
            }
          })
        );
      } else {
        processedFishCaught = fishCaught;
      }

      // Save to the database
      const createdReport = await prisma.report.create({
        data: {
          nickname,
          city,
          boat,
          landing,
          type,
          pictures: uploadedPictures.filter(Boolean) as string[],
          userEmail,
          setup,
          report,
          tripDate: new Date(tripDate),
          status: 'Pending',
          fishes: {
            create: processedFishCaught,
          },
          ...(conditions ? { conditions: Number(conditions) } : {}),
          ...(anglers ? { anglers: Number(anglers) } : {}),
        },
      });

      res.json({
        tripId: createdReport.id,
        status: createdReport.status,
        createdAt: createdReport.createdAt,
        updatedAt: createdReport.updatedAt,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create trip' });
    }
  }
);

app.put(
  '/editTrip',
  upload.fields([
    { name: 'pictures', maxCount: 10 },
    { name: 'fishCaughtPictures', maxCount: 50 },
  ]),
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { tripId, ...fieldsToUpdate } = req.body;

      if (!tripId) {
        res.status(400).json({ error: 'tripId is required' });
        return;
      }

      //@ts-ignore
      if (req.files?.['pictures']) {
        //@ts-ignore
        const pictures = req.files['pictures'] as Express.Multer.File[];
        const uploadedPictures = await Promise.all(
          pictures.map(async (file) => await uploadFileToSupabase(file))
        );
        fieldsToUpdate.pictures = uploadedPictures.filter(Boolean);
      }

      if (fieldsToUpdate.fishCaught) {
        const fishCaughtData = JSON.parse(fieldsToUpdate.fishCaught || '[]');
        const processedFishCaught = await Promise.all(
          fishCaughtData.map(async (fish: any) => {
            //@ts-ignore
            const fishPictures = req.files?.[
              'fishCaughtPictures'
            ] as Express.Multer.File[];
            const uploadedFishPictures = await Promise.all(
              fishPictures.map(async (file) => await uploadFileToSupabase(file))
            );
            return {
              ...fish,
              attachments: uploadedFishPictures.filter(Boolean),
            };
          })
        );
        fieldsToUpdate.fishes = {
          deleteMany: {}, // Clear existing fishes
          create: processedFishCaught,
        };
      }

      // Update the trip in the database
      const updatedReport = await prisma.report.update({
        where: { id: tripId },
        data: fieldsToUpdate,
      });

      res.json(updatedReport);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update trip' });
    }
  }
);

app.get('/getTripsList', adminAuth, async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.query;

    const trips = await prisma.report.findMany({
      where: userEmail ? { userEmail: userEmail as string } : {},
      include: { fishes: true },
    });

    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

app.get('/getTrip/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];

    const trip = await prisma.report.findUnique({
      where: {
        id,
      },
      include: { fishes: true },
    });

    res.json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
