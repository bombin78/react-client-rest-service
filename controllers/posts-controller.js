const { prisma } = require('../prisma/prisma-client');

const PostsController = {
	createPost: async(req, res) => {
		const { content } = req.body;

		const authorId = req.user.userId;

		if(!content) {
			return res.status(400).json({ error: 'Все поля обязательны' });
		}

		try {
			const post = await prisma.post.create({
				data: {
					content,
					authorId,
				},
			});

			res.json(post);
		} catch (error) {
			console.log('Create post error:', error);
			res.status(500).json({error: 'Internal server error'});
		}
	},
	getAllPosts: async(req, res) => {
		const userId = req.user.userId;

		try {
			const posts = await prisma.post.findMany({
				include: {
					likes: true,
					author: true,
					comments: true,
				},
				orderBy: {
					createdAt: 'desc'
				},
			});

			const postsWithLikeInfo = posts.map((post) => ({
				...post,
				likedByUser: post.likes.some((like) => like.userId === userId),
			}));

			res.json(postsWithLikeInfo);
		} catch (error) {
			console.log('Get all post error:', error);
			res.status(500).json({error: 'Internal server error'});
		}
	},
	getPostById: async(req, res) => {
		const { id } = req.params;
		const userId = req.user.userId;
		
		try {
			const post = await prisma.post.findUnique({
				where: { id },
				include: {
					likes: true,
					author: true,
					comments: {
						include: {
							user: true,
						}
					},
				},
			});

			if(!post) {
				return res.status(404).json({ error: 'Пост не найден' });
			}

			const postWithLikeInfo = {
				...post,
				likedByUser: post.likes.some((like) => like.userId === userId),
			};

			res.json(postWithLikeInfo);
		} catch (error) {
			console.log('Get post by id error:', error);
			res.status(500).json({error: 'Internal server error'});
		}
	},
	deletePost: async(req, res) => {
		const { id } = req.params;
		const userId = req.user.userId;

		try {
			const post = await prisma.post.findUnique({where: { id }});

			if (!post) {
				return res.status(404).json({ error: 'Пост не найден' });
			}

			if (post.authorId !== userId) {
				return res.status(403).json({ error: 'Нет доступа' });
			}

			const transaction = await prisma.$transaction([
				prisma.comment.deleteMany({ where: { postId: id }}),
				prisma.like.deleteMany({ where: { postId: id }}),
				prisma.post.delete({where: { id }}),
			]);

			res.json(transaction);
		} catch (error) {
			console.log('Delete post error:', error);
			res.status(500).json({error: 'Internal server error'});
		}
	},
};

module.exports = PostsController;