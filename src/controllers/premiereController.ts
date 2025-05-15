import { Request, Response } from "express";
import { prisma } from "../utils/db.js";
export const createPremiere = async (req: Request, res: Response) =>{
    try {
      const { title, description ,url } = req.body;
      console.log(req.body)
      // Save the newsletter in the database
      const newPremiere = await prisma.premiere.create({
        data: {
            title,
            description,
            url,
        },
      });
  
      res.status(201).json({
        message: 'Premiere created successfully',
        newPremiere: newPremiere,
      });
    } catch (error) {
      console.error('Error creating Premiere:', error);
      res.status(500).json({
        message: 'An error occurred while creating the Premiere.',
      });
    }
  }
  
  
  export const getPremiere = async (req: Request, res: Response) => {
    try {
      const premiere = await prisma.premiere.findMany();
      res.status(200).json(premiere);
    } catch (error) {
      console.error('Error fetching premiere:', error);
      res.status(500).json({
        message: 'An error occurred while fetching premiere.',
      });
    }
  };
  
  export const deletePremiere = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
  
      // Find the newsletter to delete
      const premiere = await prisma.latest.findUnique({
        where: { id: parseInt(id) },
      });
  
      if (!premiere) {
         res.status(404).json({
          message: 'Newsletter not found',
        });
        return
      }
      // Delete the newsletter from the database
      await prisma.premiere.delete({
        where: { id: parseInt(id) },
      });
  
      res.status(200).json({
        message: 'premiere deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting premiere:', error);
      res.status(500).json({
        message: 'An error occurred while deleting the premiere.',
      });
    }
  };

  export const getPremiereById = async (req: Request, res: Response) => {
    const { id } = req.params;  // Extract the ID from the request parameters
  
    try {
      const premiere = await prisma.premiere.findUnique({
        where: {
          id: Number(id),  // Ensure the ID is a number
        },
      });
  
      if (premiere) {
        res.status(200).json(premiere);  // Return the found record
      } else {
        res.status(404).json({ message: 'premiere not found' });  // If no record found
      }
    } catch (error) {
      console.error('Error fetching premiere by ID:', error);
      res.status(500).json({
        message: 'An error occurred while fetching the premiere record.',
      });
    }
  };